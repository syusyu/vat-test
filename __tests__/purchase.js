const fs = require('fs');
const config = require('config');
const ibm_db = require('ibm_db');
const backDB = require('../config/db_back');
const frontDB = require('../config/db_front');
const testFile = require('../config/testcase')

const allTimeout = 240000;
const preparationTimeout = 20000;
const eachTimeout = 10000;
const operationTimeout = 180000;
// const domain = '52.194.18.166/wapD';
const domain = 'okabe-server/wapD';
const rootUrl = 'http://' + domain + '/';
const backDBConnStr = `DATABASE=${backDB.db_name};HOSTNAME=${backDB.db_host};UID=${backDB.db_username};PWD=${backDB.db_password};PORT=${backDB.db_port};PROTOCOL=TCPIP`;
const frontDBConnStr = `DATABASE=${frontDB.db_name};HOSTNAME=${frontDB.db_host};UID=${frontDB.db_username};PWD=${frontDB.db_password};PORT=${frontDB.db_port};PROTOCOL=TCPIP`;
const testCases = testFile.frontPurchase;

let page;



const connectDB = async (connectStr, proc) => {
    return new Promise((resolve, reject) => {
        ibm_db.open(connectStr, async (err, conn) => {
            if (err) {
                reject(err);
            } else {
                await proc(resolve, reject, conn);
                conn.close(() => {
                    // console.debug(`Connection is closed. ${connectStr}`)
                });
            }
        });
    });
};

const settingSql = (testCase) => `update ec_contr set tax_app_kb = ${testCase['condition']['taxAppKb']} where sp_cd = 'wapD'`;

const prepare = async (testCase) => {
    await connectDB(backDBConnStr, async (resolve, reject, conn) => {
        conn.query(settingSql(testCase), (err, data) => err ? reject(err) : resolve(data));
    });
    await connectDB(frontDBConnStr, async (resolve, reject, conn) => {
        conn.query(settingSql(testCase), (err, data) => err ? reject(err) : resolve(data));
    });
};

const fetchOrderHead = async (orderNo) => {
    const orderHeads = await connectDB(backDBConnStr, async (resolve, reject, conn) => {
        const sql = `SELECT order_seq_no, sum_gk, sum_gk_nt, sum_disc,  pay_gk, pay_gk_nt, pay_tax FROM ORDER_HEAD WHERE order_no = '${orderNo}' AND sp_cd = 'wapD'`;
        conn.query(sql, (err, data) => err ? reject(err) : resolve(data));
    });
    const orderHead = orderHeads[0];
    return Object.keys(orderHead).reduce((prev, key) => (prev[key] = Number.parseInt(orderHead[key]), prev), {});
};

const fetchOrderItems = async (orderSeqNo) => {
    const orderItems = await connectDB(backDBConnStr, async (resolve, reject, conn) => {
        const sql = `SELECT cm_id, vat_division, vat_rate, order_qty, DISC_GK, DISCOUNTED_BUY_PRICE, DISCOUNTED_BUY_NPRICE
              FROM ORDER_ITEM WHERE order_seq_no in ( ${orderSeqNo} ) AND discounted_buy_price > 0`;
        conn.query(sql, (err, data) => err ? reject(err) : resolve(data));
    });
    const orderItemMap =  orderItems.reduce((result, orderItem) => {
        const numOrderItem = Object.keys(orderItem).reduce((obj, key) => (obj[key] = Number.parseInt(orderItem[key]), obj), {});
        return (result[orderItem['CM_ID']] = numOrderItem, result);
    }, {});
    return orderItemMap;
};


const getOrderNo = async () =>{
    return await page.$eval("table > tbody > tr > td", e => e.innerHTML).replace(/\[|\]/g, '');
};


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
                // await prepare(testCase);
                // Do all cache init
            });
            test('operation', async () => {
                //Selector
                const headerCartLinkSelector = 'a[href*="Cart"]';
                const loginTopLinkSelector = 'a[href*="LoginTop"]';
                const loginBtnSelector = 'a[data-action-url$="Login"]';
                const cartBtnSelector = 'img[src*="btn_buy"]';
                const checkoutBtnSelector =          'a[data-action-url$="/cart/address"]';
                const cartNextBtnOfAddressSelector = 'a[data-action-url$="/cart/addresschk"]';
                const cartNextBtnOfItemOptSelector = 'a[data-action-url$="/cart/itemoptchk"]';
                const cartNextBtnOfAddressOptSelector = 'a[data-action-url$="/cart/addressoptchk"]';
                const cartNextBtnOfPaymentSelector = 'a[data-action-url$="/cart/paymentchk"]';
                const cartNextBtnOfConfirmtSelector = 'a[data-action-url$="/cart/thankyou"]';
                const cartAddressTypeRegisterSelector = '#addrInputType_SELECT_EXIST';
                const cartAddressOptDelDaySelector = '#delDaySelect_-0-0-0';
                const cartPaymentCodSelector = '#payMethodKb_CASH_ON_DELIVERY';
                const cartPaymentCodOptionSelector = 'input[name="paymentCodOption"][value="1"]';
                const cartPaymentAgreeSelector = '#agree';
                const cartConfirmTotalPriceSelector = 'p.totalprice';

                //ItemDetail
                for (const item of testCase['condition']['items']) {
                    await page.goto(`${rootUrl}ItemDetail?cmId=${item['cmId']}`);
                    // await page.waitForNavigation();
                    await page.waitForSelector(cartBtnSelector);
                    await page.click(cartBtnSelector);
                }

                //Cart
                await page.goto(rootUrl + 'Cart');
                await page.waitFor(1000);
                let index = 1;
                for (const item of testCase['condition']['items']) {
                    const name = `#item_count_0_${(index++)}_wapD_normal`;
                    await page.evaluate( () => document.getElementById(name).value = "");
                    await page.type(name, item['qty'].toString());
                }
                await page.waitFor(5000);
                await page.waitForSelector(checkoutBtnSelector);
                await page.click(checkoutBtnSelector);
                await page.waitForNavigation();
                // await page.waitFor(1000);

                const isMember = await page.evaluate(selector => {
                    !document.querySelector(selector);
                }, loginBtnSelector);

                //Login
                if (!isMember) {
                    await page.goto(rootUrl + 'LoginTop');
                    await page.waitForSelector(loginBtnSelector);
                    await page.type('input[name="userId"]', config.purchase.email);
                    await page.type('input[name="password"]', config.purchase.password);
                    await page.click(loginBtnSelector);
                    await page.waitForNavigation();
                    let index = 1;
                    for (const item of testCase['condition']['items']) {
                        const name = `#item_count_0_${(index++)}_wapD_normal`;
                        await page.evaluate( () => document.getElementById(name).value = "");
                        await page.type(name, item['qty'].toString());
                    }
                    await page.click(checkoutBtnSelector);
                }

                //Address
                await page.waitForSelector(cartNextBtnOfAddressSelector);
                await page.click(cartNextBtnOfAddressSelector);

                //ItemOpt
                await page.waitForNavigation();
                await page.click(cartNextBtnOfItemOptSelector);

                //AddressOpt
                await page.waitForNavigation();
                await page.click(cartNextBtnOfAddressOptSelector);

                //Payment
                await page.waitForNavigation();
                await page.waitForSelector(cartPaymentCodSelector);
                await page.click(cartPaymentCodSelector);
                await page.waitForSelector(cartPaymentCodOptionSelector);
                await page.click(cartPaymentCodOptionSelector);
                await page.waitForSelector(cartPaymentAgreeSelector);
                // await page.click(cartPaymentAgreeSelector);
                await page.waitForSelector(cartNextBtnOfPaymentSelector);
                await page.click(cartNextBtnOfPaymentSelector);

                //Confirm
                await page.waitForNavigation();
                await page.waitForSelector(cartNextBtnOfConfirmtSelector);
                await page.click(cartNextBtnOfConfirmtSelector);

                //Thankyou
                await page.waitForNavigation();
            }, operationTimeout);
        });
        xtest('evaluate', async () => {
            const orderHead = await fetchOrderHead(await getOrderNo());
            await expect(testCase['expectation']['sumGk']).toEqual(orderHead['SUM_GK']);
            const orderItems = await fetchOrderItems(orderHead['ORDER_SEQ_NO']);
            const expectedItems = testCase['expectation']['items'];
            for (const cmId of Object.keys(orderItems)) {
                await expect(expectedItems[cmId]['discountedBuyPrice']).toEqual(orderItems[cmId]['DISCOUNTED_BUY_PRICE']);
            }
        });
    }
}, allTimeout);


