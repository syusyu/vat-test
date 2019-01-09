const ibm_db = require('ibm_db');
const backDB = require('../config/db_back');
const frontDB = require('../config/db_front');

const backDBConnStr = `DATABASE=${backDB.db_name};HOSTNAME=${backDB.db_host};UID=${backDB.db_username};PWD=${backDB.db_password};PORT=${backDB.db_port};PROTOCOL=TCPIP`;
const frontDBConnStr = `DATABASE=${frontDB.db_name};HOSTNAME=${frontDB.db_host};UID=${frontDB.db_username};PWD=${frontDB.db_password};PORT=${frontDB.db_port};PROTOCOL=TCPIP`;




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

const settingSql = (testCase, spCd) =>
    `update ec_contr set
      tax_app_kb = ${testCase['condition']['taxAppKb']},
      tax_fr_kb = ${testCase['condition']['taxFrKb']},
      disc_tg_kb = ${testCase['condition']['discTgKb']},
      tax_tg_kb = ${testCase['condition']['discTgKb']}
     where sp_cd = '${spCd}'`;

const orderHeadSql = (orderNo, spCd) =>
    `SELECT order_seq_no, sum_gk, sum_gk_nt, sum_disc, pay_gk, pay_gk_nt, pay_tax FROM ORDER_HEAD
         WHERE order_no = '${orderNo}' AND sp_cd = '${spCd}'`;

const orderItemSql = (orderSeqNo) =>
    `SELECT cm_id, vat_division, vat_rate, order_qty, DISC_GK, DISCOUNTED_BUY_PRICE, DISCOUNTED_BUY_NPRICE
        FROM ORDER_ITEM WHERE order_seq_no in ( ${orderSeqNo} ) AND discounted_buy_price > 0`;


module.exports.prepareSetting = async (testCase, spCd) => {
    await connectDB(backDBConnStr, async (resolve, reject, conn) => {
        conn.query(settingSql(testCase, spCd), (err, data) => err ? reject(err) : resolve(data));
    });
    await connectDB(frontDBConnStr, async (resolve, reject, conn) => {
        conn.query(settingSql(testCase), (err, data) => err ? reject(err) : resolve(data));
    });
};

module.exports.fetchOrderHead = async (orderNo, spCd) => {
    const orderHeads = await connectDB(backDBConnStr, async (resolve, reject, conn) => {
        conn.query(orderHeadSql(orderNo, spCd), (err, data) => err ? reject(err) : resolve(data));
    });
    const orderHead = orderHeads[0];
    return Object.keys(orderHead).reduce((prev, key) => (prev[key] = Number.parseInt(orderHead[key]), prev), {});
};

module.exports.fetchOrderItems = async (orderSeqNo) => {
    const orderItems = await connectDB(backDBConnStr, async (resolve, reject, conn) => {
        conn.query(orderItemSql(orderSeqNo), (err, data) => err ? reject(err) : resolve(data));
    });
    const orderItemMap =  orderItems.reduce((result, orderItem) => {
        const numOrderItem = Object.keys(orderItem).reduce((obj, key) => (obj[key] = Number.parseInt(orderItem[key]), obj), {});
        return (result[orderItem['CM_ID']] = numOrderItem, result);
    }, {});
    return orderItemMap;
};

