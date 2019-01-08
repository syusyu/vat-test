const fs = require('fs');
const dbutil = require('../utils/dbutil');
const config = require('config');
const testFile = require('../config/testcase')


const allTimeout = 600000;
const preparationTimeout = 20000;
const operationTimeout = 100000;
const navigationTimeout = 2000;

const domain = '52.194.18.166/wapD';
// const domain = 'okabe-server/wapD';
const rootUrl = 'http://' + domain + '/';

const testCases = testFile.frontPurchase;

let page;


//Function
const getOrderNo = async () =>{
    const orderNumbers = await page.$eval("table > tbody > tr > td", e => e.innerHTML);
    return orderNumbers.replace(/\[|\]/g, '');
};

//Operation
const operatePutItemToCart = async (testCase) => {
    for (const item of testCase['condition']['items']) {
        await page.goto(`${rootUrl}ItemDetail?cmId=${item['cmId']}`);
        await page.waitForSelector(cartBtnSelector);
        await page.click(cartBtnSelector);
    }
};
const operateChangeItemCount = async (testCase) => {
    let index = 1;
    for (const item of testCase['condition']['items']) {
        const itemCntTxt = await page.$(`#item_count_0_${(index++)}_wapD_normal`);
        await itemCntTxt.click();
        await itemCntTxt.focus();
        await itemCntTxt.click({clickCount: 3});
        await itemCntTxt.press('Backspace');
        await itemCntTxt.type(item['qty'].toString());
        await page.click(cartChangeCountBtnSelector);
        await page.waitFor(navigationTimeout); // Why waitForNavigation doesn't work here??
    }
};
const operateLogin = async (testCase) => {
    const isMember = await page.evaluate(selector => {
        !document.querySelector(selector);
    }, loginBtnSelector);
    if (!isMember) {
        await page.goto(rootUrl + 'LoginTop');
        await page.waitForSelector(loginBtnSelector);
        await page.type('input[name="userId"]', config.purchase.email);
        await page.type('input[name="password"]', config.purchase.password);
        await page.click(loginBtnSelector);
        await page.waitForNavigation();
        await page.goto(rootUrl + 'Cart');
        await page.waitFor(navigationTimeout); // Why waitForNavigation doesn't work here??

        await operateChangeItemCount(testCase);

        await page.click(checkoutBtnSelector);
    }
};

//Selector
const loginBtnSelector = 'a[data-action-url$="Login"]';
const cartBtnSelector = 'img[src*="btn_buy"]';
const cartChangeCountBtnSelector = 'a[data-action-url$="CartChangeCount"]';
const checkoutBtnSelector =          'a[data-action-url$="/cart/address"]';
const cartNextBtnOfAddressSelector = 'a[data-action-url$="/cart/addresschk"]';
const cartNextBtnOfItemOptSelector = 'a[data-action-url$="/cart/itemoptchk"]';
const cartNextBtnOfAddressOptSelector = 'a[data-action-url$="/cart/addressoptchk"]';
const cartNextBtnOfPaymentSelector = 'a[data-action-url$="/cart/paymentchk"]';
const cartNextBtnOfConfirmtSelector = 'a[data-action-url$="/cart/thankyou"]';
const cartPaymentCodSelector = '#payMethodKb_CASH_ON_DELIVERY';
const cartPaymentCodOptionSelector = 'input[name="paymentCodOption"][value="1"]';
const cartPaymentAgreeSelector = '#agree';

describe('Execute all test cases', () => {

    beforeAll(async () => {
        page = await global.__BROWSER__.newPage();
        // await page.setRequestInterception(true);
        // page.on("request", request => {
        //     request.continue();
        // });
    }, preparationTimeout);

    afterAll(async () => {
        await page.close();
    });

    for (const testCase of testCases) {
        describe(testCase.title, async () => {

            beforeEach(async () => {
                await dbutil.prepareSetting(testCase);
                await page.goto(`${rootUrl}system/allCacheInit`);
                await page.waitFor(1000); // Why waitForNavigation doesn't work here??
            });

            test('operation', async () => {
                //ItemDetail
                await operatePutItemToCart(testCase);

                //Cart
                await page.goto(rootUrl + 'Cart');
                await operateChangeItemCount(testCase);
                await page.waitForSelector(checkoutBtnSelector);
                await page.click(checkoutBtnSelector);
                await page.waitFor(navigationTimeout); // Why waitForNavigation doesn't work here??

                //Login
                await operateLogin(testCase);

                //Address
                await page.waitFor(navigationTimeout); // Why waitForNavigation doesn't work here??
                await page.click(cartNextBtnOfAddressSelector);

                //AddressOpt
                await page.waitForNavigation();
                await page.click(cartNextBtnOfAddressOptSelector);

                //Payment
                await page.waitFor(navigationTimeout); // Why waitForNavigation doesn't work here??
                await page.click(cartPaymentCodSelector);
                await page.click(cartPaymentCodOptionSelector);
                await page.click(cartNextBtnOfPaymentSelector);

                //Confirm
                await page.waitForNavigation();
                await page.click(cartNextBtnOfConfirmtSelector);

                //Thankyou
                await page.waitFor(10000); // Why waitForNavigation doesn't work here??
            }, operationTimeout);
        });

        test('Evaluate the tax calculation', async () => {
            const orderHead = await dbutil.fetchOrderHead(await getOrderNo());
            await expect(testCase['expectation']['payGk']).toEqual(orderHead['PAY_GK']);
            await expect(testCase['expectation']['payGkNt']).toEqual(orderHead['PAY_GK_NT']);
            await expect(testCase['expectation']['payTax']).toEqual(orderHead['PAY_TAX']);
            await expect(testCase['expectation']['sumGk']).toEqual(orderHead['SUM_GK']);
            await expect(testCase['expectation']['sumGkNt']).toEqual(orderHead['SUM_GK_NT']);
            await expect(testCase['expectation']['sumDisc']).toEqual(orderHead['SUM_DISC']);

            const orderItems = await dbutil.fetchOrderItems(orderHead['ORDER_SEQ_NO']);
            for (const cmId of Object.keys(orderItems)) {
                const expectedItem = testCase['expectation']['items'][cmId];
                await expect(expectedItem['discountedBuyPrice']).toEqual(orderItems[cmId]['DISCOUNTED_BUY_PRICE']);
                await expect(expectedItem['discountedBuyNprice']).toEqual(orderItems[cmId]['DISCOUNTED_BUY_NPRICE']);
                await expect(expectedItem['discGk']).toEqual(orderItems[cmId]['DISC_GK']);
                await expect(expectedItem['vatDivision']).toEqual(orderItems[cmId]['VAT_DIVISION']);
                await expect(expectedItem['vatRate']).toEqual(orderItems[cmId]['VAT_RATE']);
            }
        }, operationTimeout);
    }
}, allTimeout);


