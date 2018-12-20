const fs = require('fs');
const config = require('config');
const ibm_db = require('ibm_db');
const backDB = require('../config/db_back_setting');
const frontDB = require('../config/db_front_setting');
const testFile = require('../test-cases/front_purchase')

const preparationTimeout = 20000;
const eachTimeout = 10000;
// const domain = '54.248.105.196';
const domain = 'www.worksap.co.jp';
const rootUrl = 'https://' + domain + '/';
const backDBConnStr = `DATABASE=${backDB.db_name};HOSTNAME=${backDB.db_host};UID=${backDB.db_username};PWD=${backDB.db_password};PORT=${backDB.db_port};PROTOCOL=TCPIP`;
const frontDBConnStr = `DATABASE=${frontDB.db_name};HOSTNAME=${frontDB.db_host};UID=${frontDB.db_username};PWD=${frontDB.db_password};PORT=${frontDB.db_port};PROTOCOL=TCPIP`;
const testCases = testFile.testCases;

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
        conn.query(`update ec_contr set tax_app_kb = ${testCase['condition']['taxAppKb']} where sp_cd = 'wapD'`, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

const fetchOrderHead = async (testCase, orderNo) => {
    const result = await connectDB(backDBConnStr, async (resolve, reject, conn) => {
        conn.query(`SELECT sum_gk, sum_gk_nt, sum_disc,  pay_gk, pay_gk_nt, pay_tax FROM ORDER_HEAD WHERE order_no = '${orderNo}' AND sp_cd = 'wapD'`, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
    return result[0];
};


const pageSelector = '#content';
const expectPageShown = async () => {
    await page.waitForSelector(pageSelector);
    const existsTopImages = await page.evaluate(topPageSelector => {
        return document.querySelector(topPageSelector).children.length > 0;
    }, pageSelector);
    expect(existsTopImages).toEqual(true);
};

const getOrderNo = async () =>{
    // const pageSelector = '';
    // const orderNo = await page.evaluate(topPageSelector => {
    //     return document.querySelector(topPageSelector).value;
    // }, pageSelector);
    // return orderNo;
    return '2017-12-000029';
}


describe('Execute all test cases', () => {
    beforeAll(async () => {
        page = await global.__BROWSER__.newPage();
        await page.setRequestInterception(true);
        page.on("request", request => {
            request.continue();
        });
        page.on('console', consoleMessage => {
            if (consoleMessage.type() === 'debug') {
                console.debug(`########## ${consoleMessage.text()}`)
            }
        });
    }, preparationTimeout);

    afterAll(async () => {
        await page.close();
    });

    for (const testCase of testCases) {
        describe(testCase.title, async () => {
            beforeEach(async () => {
                await prepare(testCase);
            });
            test('operation', async () => {
                await page.goto(rootUrl + 'Index');
                await expectPageShown();
                await page.goto(rootUrl + 'item/0101-0');
                await expectPageShown();
            });
        });
        test('evaluate', async () => {
            const orderHead = await fetchOrderHead(testCase, await getOrderNo());
            await expect('3240').toEqual(orderHead['SUM_GK']);
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

}, 120000);


