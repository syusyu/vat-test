Front purchase autotest
=======================

フロント購入時税額計算確認用の自動テストプログラムです。


## Description
[Puppeteer](https://github.com/GoogleChrome/puppeteer) を利用して以下のテストを自動実行します。
- テストケースに従って、EC_CONTR(Front, Back)の設定を変更
- フロントサイトにて商品を購入
- 購入後に作成されるORDER_HEAD, ORDER_ITEMの値が、テストケースの期待値と合致しているかを評価


## Requirement
[Node.js](https://nodejs.org/en/) が必要です。
以下のコマンドを実行してバージョンが確認できればすでにインストールされています。
- `node --version`
- `npm --version`


## Install and Execute
- 以下のディレクトリをローカルに配置します。
  - `https://ec2-54-248-114-191.ap-northeast-1.compute.amazonaws.com/svn/sandbox/法改正対応/ツール/vat-front-autotest`
- ディレクトリに移動します。
  - `cd ./vat-front-autotest`
- 必要なライブラリをダウンロードします。
  - `npm install`
- フロント購入を行うアカウントのユーザIDとパスワードを設定します。
  - `vat-front-autotest/config/test.json`
- テストを実行します。
  - `npm test`


## Usage
### Test case
- テストケースは、`vat-front-autotest/config/testcase.json`に定義されています。
- テスト条件は、`condition`に定義します。
    - taxAppKb: 税計算区分 (1:合算, 2:商品積み上げ)
    - taxFrKb: 税計算端数処理 (1:切り捨て, 2:切り上げ, 3:四捨五入)
    - discTgKb: 割引対象区分 (0:税込価格, 1:税抜価格)
    - items.cmId: 購入商品のcmId (itemsのその他のプロパティは自動テストプログラム上では利用していません)
- テスト期待値は、`expectation`に定義します。
    - payGk: ORDER_HEAD.PAY_GK
    - payGkNt: ORDER_HEAD.PAY_GK_NT
    - payTax: ORDER_HEAD.PAY_TAX
    - sumGk: ORDER_HEAD.SUM_GK
    - sumGkNt: ORDER_HEAD.SUM_GK_NT
    - sumDisc: ORDER_HEAD.SUM_DISC
    - items.数字: ORDER_ITEM.CM_ID
    - items.数字.discountedBuyPrice: ORDER_ITEM.DISCOUNTED_BUYPRICE
    - ...

### Timeout
- 全テストケース実行に20分以上かかる場合、タイムアウトエラーが発生します。その場合以下の設定値を変更し、タイムアウト時間を延ばしてください。
  - `jest.setup.js global.TIMEOUT.all`

- 1購入フロー実行に2分以上かかる場合、同様に以下の設定値を変更してください。
  - `jest.setup.js global.TIMEOUT.operation`

### SSL
[Puppeteer](https://github.com/GoogleChrome/puppeteer) はSSLに対応していますが、実際には期待通りに動きません。
テスト対象URLは非SSLのみにしてください。(ローカルAPを想定しています)

### Setting
- 接続先DBは、`config.db_back.js` `config.db_front.js` にて定義します。
- テストサイトのドメインは、`test.purchase.domain` にて定義します。
- テストサイトのショップコードは、`test.purchase.spCd` にて定義します。

