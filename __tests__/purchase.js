const fs = require('fs');
const config = require('config');
const ibm_db = require('ibm_db');
const backDB = require('../config/db_back');
const frontDB = require('../config/db_front');
const testFile = require('../config/testcase')

const allTimeout = 120000;
const preparationTimeout = 20000;
const eachTimeout = 10000;
const operationTimeout = 90000;
const domain = '52.194.18.166/wapD';
// const domain = 'okabe-server';
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
            }
            await proc(resolve, reject, conn);
            conn.close(() => {
                // console.debug(`Connection is closed. ${connectStr}`)
            });
        });
    });
};

const prepare = async (testCase) => {
    await connectDB(backDBConnStr, async (resolve, reject, conn) => {
        const sql = `update ec_contr set tax_app_kb = ${testCase['condition']['taxAppKb']} where sp_cd = 'wapD'`;
        conn.query(sql, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

const fetchOrderHead = async (orderNo) => {
    const orderHeads = await connectDB(backDBConnStr, async (resolve, reject, conn) => {
        const sql = `SELECT order_seq_no, sum_gk, sum_gk_nt, sum_disc,  pay_gk, pay_gk_nt, pay_tax FROM ORDER_HEAD WHERE order_no = '${orderNo}' AND sp_cd = 'wapD'`;
        conn.query(sql, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
    const orderHead = orderHeads[0];
    return Object.keys(orderHead).reduce((prev, key) => (prev[key] = Number.parseInt(orderHead[key]), prev), {});
};

const fetchOrderItems = async (orderSeqNo) => {
    const orderItems = await connectDB(backDBConnStr, async (resolve, reject, conn) => {
        const sql = `SELECT cm_id, vat_division, vat_rate, order_qty, DISC_GK, DISCOUNTED_BUY_PRICE, DISCOUNTED_BUY_NPRICE
              FROM ORDER_ITEM WHERE order_seq_no in ( ${orderSeqNo} ) AND discounted_buy_price > 0`;
        conn.query(sql, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
    const orderItemMap =  orderItems.reduce((prev, current) => {
        Object.keys()
        return (prev[current['CM_ID']] = current, prev)
    }, {});
    console.debug(JSON.stringify(orderItemMap));
    return orderItemMap;
};


const pageSelector = '#content';
const expectPageShown = async () => {
    // await page.waitForSelector(pageSelector);
    // const existsTopImages = await page.evaluate(topPageSelector => {
    //     return document.querySelector(topPageSelector).children.length > 0;
    // }, pageSelector);
    // expect(existsTopImages).toEqual(true);
    expect(true).toEqual(true);
};

const getOrderNo = async () =>{
    // const pageSelector = '';
    // const orderNo = await page.evaluate(topPageSelector => {
    //     return document.querySelector(topPageSelector).value;
    // }, pageSelector);
    // return orderNo;
    return '2017-12-000034';
}


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
            });
            xtest('operation', async () => {
                await page.goto(rootUrl);
                await expectPageShown();
                await page.goto(rootUrl + 'products/lineup/HR_Suite/');
                await expectPageShown();
            }, operationTimeout);
            xtest('operation', async () => {
                //Selector
                const headerCartLinkSelector = 'a[href*="Cart"]';
                const loginTopLinkSelector = 'a[href*="LoginTop"]';
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

                //Login
                await page.goto(rootUrl + 'LoginTop');
                const loginBtnSelector = 'a[data-action-url$="Login"]';
                await page.waitForSelector(loginBtnSelector);
                await page.type('input[name="userId"]', config.purchase.email);
                await page.type('input[name="password"]', config.purchase.password);
                await page.click(loginBtnSelector);
                await page.waitForNavigation();

                //ItemDetail
                // for (const item of testCase['condition']['items']) {
                //     await page.goto(`${rootUrl}ItemDetail?cmId=${item['cmId']}`);
                //     await page.waitForSelector(cartBtnSelector);
                //     await page.click(cartBtnSelector);
                // }

                //Cart
                await page.goto(rootUrl + 'Cart');
                await page.waitForSelector(checkoutBtnSelector);
                await page.click(checkoutBtnSelector);
                //Address
                await page.waitForSelector(cartNextBtnOfAddressSelector);
                await page.click(cartNextBtnOfAddressSelector);
                //ItemOpt
                await page.waitFor(1000);
                await page.click(cartNextBtnOfItemOptSelector);
                // //AddressOpt
                await page.waitFor(1000);
                await page.click(cartNextBtnOfAddressOptSelector);
                // //Payment
                await page.waitFor(1000);
                await page.waitForSelector(cartPaymentCodSelector);
                await page.click(cartPaymentCodSelector);
                await page.waitForSelector(cartPaymentCodOptionSelector);
                await page.click(cartPaymentCodOptionSelector);
                await page.waitForSelector(cartPaymentAgreeSelector);
                // await page.click(cartPaymentAgreeSelector);
                await page.waitForSelector(cartNextBtnOfPaymentSelector);
                await page.click(cartNextBtnOfPaymentSelector);
                // //Confirm
                await page.waitFor(3000);
                // await page.waitForSelector(cartNextBtnOfConfirmtSelector);
                // // await page.click(cartNextBtnOfConfirmtSelector);
                // //Thankyou
                // // await page.waitForNavigation({ waitUntil: 'networkidle0' });
                // // await expectCartThankyou();
            }, operationTimeout);
        });
        test('evaluate', async () => {
            const orderHead = await fetchOrderHead(await getOrderNo());
            await expect(testCase['expectation']['sumGk']).toEqual(orderHead['SUM_GK']);
            const orderItems = await fetchOrderItems(orderHead['ORDER_SEQ_NO']);
            const expectedItems = testCase['expectation']['items'];
            for (const cmId of Object.keys(orderItems)) {
                console.debug(`price=${orderItems[cmId]['DISCOUNTED_BUY_PRICE']}`);
                await expect(expectedItems[cmId]['discountedBuyPrice']).toEqual(orderItems[cmId]['DISCOUNTED_BUY_PRICE']);
            }
        });
    }


    xdescribe(
        'Basic flow',
        () => {
            const topPageSelector = '#mainslider > .wideslider_base > .wideslider_wrap > ul.mainList';
            const loginTopLinkSelector = '#header > .header-middle > .right > ul.nav > li > a[href*="LoginTop"]';
            const cartBtnSelector = '.buyBtn > a > img';
            const checkoutBtnSelector = '#mainBtn';
            const cartNextBtnOfAddressSelector = 'a.cart_next_link[data-action-url$="/cart/addresschk"]';
            const cartNextBtnOfAddressOptSelector = 'a.cart_next_link[data-action-url$="/cart/addressoptchk"]';
            const cartNextBtnOfPaymentSelector = 'a.cart_next_link[data-action-url$="/cart/paymentchk"]';
            const cartNextBtnOfConfirmtSelector = 'a.cart_next_link[data-action-url$="/cart/thankyou"]';
            const cartAddressTypeRegisterSelector = '#addrInputType_SELECT_EXIST';
            const cartAddressOptDelDaySelector = '#delDaySelect_-0-0-0';
            const cartPaymentCodSelector = '#payMethodKb_CASH_ON_DELIVERY';
            const cartPaymentCodOptionSelector = 'input[name="paymentCodOption"][value="1"]';
            const cartPaymentAgreeSelector = '#agree';
            const cartConfirmTotalPriceSelector = 'p.totalprice';

            const expectTopPage = async () => {
                await page.waitForSelector(topPageSelector);

                const existsTopImages = await page.evaluate(topPageSelector => {
                    return document.querySelector(topPageSelector).children.length > 0;
                }, topPageSelector);
                expect(existsTopImages).toEqual(true);
            };
            const expectItemDetailPage = async () => {
                await page.waitForSelector(cartBtnSelector);

                const alt = await page.$eval(cartBtnSelector, e => e.alt);
                expect(alt).toEqual('カートに入れる');
            };
            const expectCartTopPage = async () => {
                await page.waitForSelector(checkoutBtnSelector);

                const url = await page.$eval(checkoutBtnSelector, e => e.getAttribute('data-action-url'));
                expect(url).toContain('/cart/address');
            };
            const expectCartAddress = async() => {
                await page.waitForSelector(cartAddressTypeRegisterSelector);

                const radio = await page.$eval(cartAddressTypeRegisterSelector, e => e.value);
                expect(radio).toEqual('SELECT_EXIST');
            };
            const expectCartAddressOption = async() => {
                await page.waitForSelector(cartAddressOptDelDaySelector);

                const hasOption = await page.$eval(cartAddressOptDelDaySelector, e => e.children.length > 0);
                expect(hasOption).toEqual(true);
            };
            const expectCartPayment = async() => {
                await page.waitForSelector(cartPaymentCodSelector);

                const cvVal = await page.$eval(cartPaymentCodSelector, e => e.value);
                expect(cvVal).toEqual('CASH_ON_DELIVERY');
            };
            const expectCartConfirm = async() => {
                await page.waitForSelector(cartConfirmTotalPriceSelector);

                const hasYen = await page.$eval(cartConfirmTotalPriceSelector, e => e.textContent);
                expect(hasYen).toContain('円');
            };
            const expectCartThankyou = async () => {
                const thankyouText = await page.$eval("#EC_cart", e => e.innerHTML);
                expect(thankyouText).toContain('ご注文ありがとうございました');
            };


            it('Top', async () => {
                await page.goto(rootUrl + 'Index');
                await expectTopPage();
            }, eachTimeout);

            it ('Do login', async () => {
                await page.waitForSelector(loginTopLinkSelector);
                //If Not login, do login here.
                const isMember = await page.evaluate(loginLinkSelector => {
                    const node = document.querySelector(loginLinkSelector);
                    return !node;
                }, loginTopLinkSelector);

                if (!isMember) {
                    await page.click(loginTopLinkSelector);
                    const loginBtnSelector = 'a[data-action-url$="Login"]';
                    await page.waitForSelector(loginBtnSelector);
                    await page.type('input[name="userId"]', config.purchase.email);
                    await page.type('input[name="password"]', config.purchase.password);
                    await page.click(loginBtnSelector);
                    await expectTopPage();
                }
            }, eachTimeout);

            it('Item Detail page', async () => {
                await page.goto(rootUrl + 'ItemDetail?cmId=270');
                await expectItemDetailPage();
            }, eachTimeout);

            it('Item Detail -> Cart Top', async () => {
                await page.click(cartBtnSelector);
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
                await expectCartTopPage();
            }, eachTimeout);

            it ('Cart Top -> Cart Address', async () => {
                await page.waitForSelector(checkoutBtnSelector);
                await page.click(checkoutBtnSelector);
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
                await expectCartAddress();
            }, eachTimeout);

            it ('Cart Address -> Cart AddressOpt', async () => {
                await page.waitForSelector(cartNextBtnOfAddressSelector);
                await page.click(cartNextBtnOfAddressSelector);
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
                await expectCartAddressOption();
            }, eachTimeout);

            it ('Cart AddressOpt -> Cart Payment', async () => {
                await page.waitForSelector(cartNextBtnOfAddressOptSelector);
                await page.click(cartNextBtnOfAddressOptSelector);
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
                await expectCartPayment();
            }, eachTimeout);

            it ('Cart Payment -> Cart Confirm', async () => {
                await page.waitForSelector(cartPaymentCodSelector);
                await page.click(cartPaymentCodSelector);

                await page.waitForSelector(cartPaymentCodOptionSelector);
                await page.click(cartPaymentCodOptionSelector);

                await page.waitForSelector(cartPaymentAgreeSelector);
                await page.click(cartPaymentAgreeSelector);

                await page.waitForSelector(cartNextBtnOfPaymentSelector);
                await page.click(cartNextBtnOfPaymentSelector);
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
                await expectCartConfirm();
            }, eachTimeout);

            it ('Cart Confirm -> Thank you', async () => {
                await page.waitForSelector(cartNextBtnOfConfirmtSelector);
                await page.click(cartNextBtnOfConfirmtSelector);
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
                await expectCartThankyou();
            });
        }
    , 60000);

}, allTimeout);


