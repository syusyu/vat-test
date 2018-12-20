const fs = require('fs');
const config = require('config');
const ibm_db = require('ibm_db');
const backDB = require('../config/db_back_setting');
const frontDB = require('../config/db_front_setting');

const preparationTimeout = 20000;
const eachTimeout = 10000;
const domain = '54.248.105.196';
const rootUrl = 'https://' + domain + '/';
const backDBConnStr = `DATABASE=${backDB.db_name};HOSTNAME=${backDB.db_host};UID=${backDB.db_username};PWD=${backDB.db_password};PORT=${backDB.db_port};PROTOCOL=TCPIP`;
const frontDBConnStr = `DATABASE=${frontDB.db_name};HOSTNAME=${frontDB.db_host};UID=${frontDB.db_username};PWD=${frontDB.db_password};PORT=${frontDB.db_port};PROTOCOL=TCPIP`;

let page;
let testConditions;

const connectBackDB = async () => {
    const sql = 'SELECT * FROM VAT_DIVISION_HISTORY';
    await doConnect(connectStr, sql).then(data => {
        testConditions = data;
    }).catch(err => {
        console.debug(err);
    })
};

const doConnect = async (connectStr, sql) => {
    return new Promise((resolve, reject) => {
        ibm_db.open(connectStr, (err, conn) => {
            if (err) {
                reject(err);
            }
            let result;
            conn.query(sql, (err, data) => {
                if (err) {
                    reject(err);
                }
                result = data;
            });
            conn.close(() => {
                console.debug(`Connection is closed. ${connectStr}`)
                resolve(result);
            });
        });
    });
};

const connectDB = async (connectStr, proc) => {
    return new Promise((resolve, reject) => {
        ibm_db.open(connectStr, (err, conn) => {
            if (err) {
                reject(err);
            }
            let result;
            proc(resolve, reject, conn);
            conn.close(() => {
                console.debug(`Connection is closed. ${connectStr}`)
                resolve(result);
            });
        });
    });
};

const prepare = async (testCase) => {
    await connectDB(backDBConnStr, (resolve, reject, conn) => {
        conn.query(`update ec_contr set tax_app_kb = ${testCase['condition']['taxAppKb']} where sp_cd = 'wapD'`, (err, data) => {
            if (err) {
                reject(err);
            }
            conn.query(`select tax_app_kb from ec_contr where sp_cd = 'wapD`, (err, data) => {
                resolve(data);
            });
        });
    }).then(data => {
        console.debug(JSON.stringify(data));
        // console.debug(`taxAppKb=${data.taxAppKb}`);
    }).catch(err => {
        console.debug(err);
    });
};

let testCases = [
    {
        'title': 'case.1-A',
        'condition': {
            'taxAppKb': 0, 'taxFrKb': 0, 'discTgKb': 0, 'taxTgKb': 0,
            'items': [
                {'cmId': 104, 'siPrice': 3240, 'snPrice': 2945, 'qty': 3},
                {'cmId': 48, 'siPrice': 1000, 'snPrice': 909, 'qty': 2},
            ],
        },
        'expectation': {
            'payGk': 10748, 'payGkNt': 9771, 'payTax': 977, 'sumGk': 11720, 'sumGkNt': 10653, 'sumDisc': 972,
            'items': {
                '104': {
                    'discountedBuyPrice': 8748, 'discountedBuyNprice': 7953, 'sumDisc': 972,
                },
                '48': {
                    'discountedBuyPrice': 2000, 'discountedBuyNprice': 1848, 'sumDisc': 0,
                },
            }
        }
    }
    ];

describe('Execute all test cases', () => {
    beforeAll(async () => {
        console.debug('Before All started...')
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
        console.debug('After All started...')
        await page.close();
    });

    for (const testCase of testCases) {
        describe(testCase.title, async () => {
            beforeEach(async () => {
                console.debug('Before Each started...')
                await prepare(testCase);
                console.debug('Before Each ended...')
            });
            test(testCase.title, async () => {
                console.debug('Do test case...')
                await expect(true).toEqual(true);
            });
            afterEach(async () => {
                console.debug('After Each started...')
            });
        });
    }

    xdescribe('dummy', () => {
        it('Dummy', async () => {
            console.debug('Dummy test started.');
            await expect(true).toEqual(true);
        }, eachTimeout);
    }, 1000);

    xdescribe('dummy', () => {
        it('Dummy', async () => {
            console.debug('Dummy test started.');
            await expect(true).toEqual(true);
        }, eachTimeout);
    }, 1000);

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


