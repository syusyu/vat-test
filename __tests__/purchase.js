const dbutil = require('../utils/dbutil');
const config = require('config');
const testFile = require('../config/testcase');


const allTimeout = 600 * 1000; // Wait 600s = 10m
const operationTimeout = 60 * 1000; // Wit 60s = 1m

const domain = '52.194.18.166/wapD';
// const domain = 'okabe-server/wapD';
const rootUrl = 'http://' + domain + '/';

const testCases = testFile.frontPurchase;

let page;

//Selector
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

describe('Execute all test cases', () => {

    beforeAll(async () => {
        page = await global.__BROWSER__.newPage();
        // await page.setRequestInterception(true);
        // page.on("request", request => {
        //     request.continue();
        // });
    });

    afterAll(async () => {
        await page.close();
    });

    for (const testCase of testCases) {
        describe(testCase.title, async () => {

            beforeEach(async () => {
                //Change EcContr
                await dbutil.prepareSetting(testCase);

                //Clear front cache
                await page.goto(`${rootUrl}system/allCacheInit`);
                await waitMoment();
            });

            test('operation', async () => {
                //ItemDetail
                await operatePutItemToCart(testCase);

                //Cart top
                await waitMoment();
                await page.goto(rootUrl + 'Cart');

                //Change item quantity
                await waitMoment();
                await operateChangeItemCount(testCase);
                await page.waitForSelector(checkoutBtnSelector);
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
                await page.click(cartNextBtnOfPaymentSelector);

                //Confirm
                await waitMoment();
                await page.click(cartNextBtnOfConfirmSelector);

                //Thank-you
                await waitOrder();
            });
        }, operationTimeout);

        test('Evaluate the tax calculation', async () => {
            //Evaluate OrderHead
            const orderHead = await dbutil.fetchOrderHead(await getOrderNo());
            await expect(testCase['expectation']['payGk']).toEqual(orderHead['PAY_GK']);
            await expect(testCase['expectation']['payGkNt']).toEqual(orderHead['PAY_GK_NT']);
            await expect(testCase['expectation']['payTax']).toEqual(orderHead['PAY_TAX']);
            await expect(testCase['expectation']['sumGk']).toEqual(orderHead['SUM_GK']);
            await expect(testCase['expectation']['sumGkNt']).toEqual(orderHead['SUM_GK_NT']);
            await expect(testCase['expectation']['sumDisc']).toEqual(orderHead['SUM_DISC']);

            //Evaluate OrderItem
            const orderItems = await dbutil.fetchOrderItems(orderHead['ORDER_SEQ_NO']);
            for (const cmId of Object.keys(orderItems)) {
                const expectedItem = testCase['expectation']['items'][cmId];
                await expect(expectedItem['discountedBuyPrice']).toEqual(orderItems[cmId]['DISCOUNTED_BUY_PRICE']);
                await expect(expectedItem['discountedBuyNprice']).toEqual(orderItems[cmId]['DISCOUNTED_BUY_NPRICE']);
                await expect(expectedItem['discGk']).toEqual(orderItems[cmId]['DISC_GK']);
                await expect(expectedItem['vatDivision']).toEqual(orderItems[cmId]['VAT_DIVISION']);
                await expect(expectedItem['vatRate']).toEqual(orderItems[cmId]['VAT_RATE']);
            }
        });
    }
}, allTimeout);


//Operation
const operatePutItemToCart = async (testCase) => {
    for (const item of testCase['condition']['items']) {
        //Show ItemDetail page
        await page.goto(`${rootUrl}ItemDetail?cmId=${item['cmId']}`);
        await page.waitForSelector(cartBtnSelector);

        //Put the item to Cart
        await page.click(cartBtnSelector);
    }
};

const operateChangeItemCount = async (testCase) => {
    let index = 1;
    for (const item of testCase['condition']['items']) {
        //Change item quantity
        const itemCntTxt = await page.$(`#item_count_0_${(index++)}_wapD_normal`);
        await itemCntTxt.click();
        await itemCntTxt.focus();
        await itemCntTxt.click({clickCount: 3});
        await itemCntTxt.press('Backspace');
        await itemCntTxt.type(item['qty'].toString());

        //Put change quantity button
        await page.click(cartChangeCountBtnSelector);
    }
};

const operateLogin = async (testCase) => {
    const isMember = await page.evaluate(selector => {
        return !document.querySelector(selector);
    }, loginBtnSelector);

    if (!isMember) {
        //If guest user, show the login top page
        await page.goto(rootUrl + 'LoginTop');
        await page.waitForSelector(loginBtnSelector);

        //Input userId and password
        await page.type('input[name="userId"]', config.purchase.email);
        await page.type('input[name="password"]', config.purchase.password);

        //Push login button
        await page.click(loginBtnSelector);

        //Show Cart top page
        await waitMoment();
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

const waitOrder = async () => {
    // Actually here, page.waitForSelector(selector) or page.waitForNavigation() is better.
    // But those don't work so use page.waitFor as a workaround.
    await page.waitFor(10 * 1000); // Wait 10s
};