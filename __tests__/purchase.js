const dbutil = require('../utils/dbutil');
const config = require('config');
const testFile = require('../config/testcase');


const allTimeout = global.TIMEOUT.all;
const operationTimeout = global.TIMEOUT.operation;

const spCd = config.purchase.spCd;
const rootUrl = 'http://' + config.purchase.domain + `/${spCd}/`;

const testCases = testFile.frontPurchase;

let page;

//Selector
const loginTopLinkSelector = 'a[href$="LoginTop"]';
const loginBtnSelector = 'a[data-action-url$="Login"]';
const cartBtnSelector = 'img[src*="btn_buy"]';
const cartChangeCountBtnSelector = 'a[data-action-url$="CartChangeCount"]';
const checkoutBtnSelector =          'a[data-action-url$="/cart/address"]';
const cartNextBtnOfAddressSelector = 'a[data-action-url$="/cart/addresschk"]';
const cartNextBtnOfItemOptSelector = 'a[data-action-url$="/cart/itemoptchk"]';
const cartNextBtnOfAddressOptSelector = 'a[data-action-url$="/cart/addressoptchk"]';
const cartNextBtnOfPaymentSelector = 'a[data-action-url$="/cart/paymentchk"]';
const cartNextBtnOfConfirmSelector = 'a[data-action-url$="/cart/thankyou"]';
const cartPaymentCodSelector = '#payMethodKb_CASH_ON_DELIVERY';
const cartPaymentCodOptionSelector = 'input[name="paymentCodOption"][value="1"]';
const cartPaymentAgreeSelector = '#agree';

describe('Execute all test cases', () => {

    beforeAll(async () => {
        page = await global.__BROWSER__.newPage();
        /** For SSL **/
        // await page.setRequestInterception(true);
        // page.on("request", request => {
        //     request.continue();
        // });
        /** For SSL **/
    });

    afterAll(async () => {
        await page.close();
    });

    for (const testCase of testCases) {
        describe(`Purchase in Normal-Cart-Flow - ${testCase.title}`, async () => {

            beforeEach(async () => {
                //Change EcContr
                await dbutil.prepareSetting(testCase, spCd);

                //Clear front cache
                await page.goto(`${rootUrl}system/allCacheInit`);
                await waitMoment();
            });

            test('Operate browser', async () => {

                //ItemDetail
                await operatePutItemToCart(testCase);

                //Cart top
                await waitMoment();
                await page.goto(rootUrl + 'Cart');

                //Change item quantity
                await waitMoment();
                await operateChangeItemCount(testCase);
                await waitMoment();
                await page.click(checkoutBtnSelector);

                //Login (only for guest user)
                await waitMoment();
                await operateLogin(testCase);

                //Address
                await waitMoment();
                await page.click(cartNextBtnOfAddressSelector);

                //AddressOpt
                await waitMoment();
                await page.click(cartNextBtnOfAddressOptSelector);

                //Payment
                await waitMoment();
                await page.click(cartPaymentCodSelector);
                await page.click(cartPaymentCodOptionSelector);
                await page.click(cartPaymentAgreeSelector);
                await page.click(cartNextBtnOfPaymentSelector);

                //Confirm
                await waitMoment();
                await page.click(cartNextBtnOfConfirmSelector);

                //Thank-you
                await waitOrder();
            });
        }, operationTimeout);

        test(`Evaluate - ${testCase.title}`, async () => {
            const orderNo = await getOrderNo();
            console.log(`testCase=${testCase.title}, orderNo=${orderNo}`);

            //Evaluate OrderHead
            const orderHead = await dbutil.fetchOrderHead(orderNo, spCd);
            await expect(orderHead['PAY_GK']   ).toEqual(testCase['expectation']['payGk']);
            await expect(orderHead['PAY_GK_NT']).toEqual(testCase['expectation']['payGkNt']);
            await expect(orderHead['PAY_TAX']  ).toEqual(testCase['expectation']['payTax']);
            await expect(orderHead['SUM_GK']   ).toEqual(testCase['expectation']['sumGk']);
            await expect(orderHead['SUM_GK_NT']).toEqual(testCase['expectation']['sumGkNt']);
            await expect(orderHead['SUM_DISC'] ).toEqual(testCase['expectation']['sumDisc']);

            //Evaluate OrderItem
            const orderItems = await dbutil.fetchOrderItems(orderHead['ORDER_SEQ_NO']);
            for (const cmId of Object.keys(orderItems)) {
                const expectedItem = testCase['expectation']['items'][cmId];
                await expect(orderItems[cmId]['DISCOUNTED_BUY_PRICE'] ).toEqual(expectedItem['discountedBuyPrice']);
                await expect(orderItems[cmId]['DISCOUNTED_BUY_NPRICE']).toEqual(expectedItem['discountedBuyNprice']);
                await expect(orderItems[cmId]['DISC_GK']                 ).toEqual(expectedItem['discGk']);
                await expect(orderItems[cmId]['VAT_DIVISION']           ).toEqual(expectedItem['vatDivision']);
                await expect(orderItems[cmId]['VAT_RATE']                ).toEqual(expectedItem['vatRate']);
            }
        });
    }
}, allTimeout);


//Operation
const operatePutItemToCart = async (testCase) => {
    for (const item of testCase['condition']['items']) {
        //Show ItemDetail page
        await page.goto(`${rootUrl}ItemDetail?cmId=${item['cmId']}`);
        await waitMoment();

        //Put the item to Cart
        await page.click(cartBtnSelector);
    }
};

const operateChangeItemCount = async (testCase) => {
    let index = 1;
    for (const item of testCase['condition']['items']) {
        //Change item quantity
        const itemCntTxt = await page.$(`#item_count_0_${(index++)}_${spCd}_normal`);
        await waitLonger();
        await itemCntTxt.click();
        await itemCntTxt.focus();
        await itemCntTxt.click({clickCount: 3});
        await itemCntTxt.press('Backspace');
        await itemCntTxt.type(item['qty'].toString());

        //Put change quantity button
        await page.click(cartChangeCountBtnSelector);
        await waitLonger();
    }
};

const operateLogin = async (testCase) => {
    const isMember = await page.evaluate(selector => {
        return !document.querySelector(selector);
    }, loginTopLinkSelector);

    if (!isMember) {
        //If guest user, show the login top page
        await page.goto(rootUrl + 'LoginTop');
        await waitMoment();

        //Input userId and password
        await page.type('input[name="userId"]', config.purchase.email);
        await page.type('input[name="password"]', config.purchase.password);

        //Push login button
        await page.click(loginBtnSelector);

        //Show Cart top page
        await waitLonger();
        await page.goto(rootUrl + 'Cart');

        //Change item quantity
        await waitMoment();
        await operateChangeItemCount(testCase);

        //Push checkout button
        await waitMoment();
        await page.click(checkoutBtnSelector);
    }
};


//Function
const getOrderNo = async () =>{
    const orderNumbers = await page.$eval("table > tbody > tr > td", e => e.innerHTML);
    return orderNumbers.replace(/\[|\]/g, '');
};

const waitMoment = async () => {
    // Actually here, page.waitForSelector(selector) or page.waitForNavigation() is better.
    // But those don't work so use page.waitFor as a workaround.
    await page.waitFor(2 * 1000); // Wait 2s
};

const waitLonger = async () => {
    // Actually here, page.waitForSelector(selector) or page.waitForNavigation() is better.
    // But those don't work so use page.waitFor as a workaround.
    await page.waitFor(10 * 1000); // Wait 10s
};

const waitOrder = async () => {
    // Actually here, page.waitForSelector(selector) or page.waitForNavigation() is better.
    // But those don't work so use page.waitFor as a workaround.
    await page.waitFor(15 * 1000); // Wait 10s
};