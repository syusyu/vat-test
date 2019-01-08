Front purchase autotest for tax calculation
===========================================

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


## Usage
- プロジェクトをチェックアウトします。
  - `svn co http://.....`
  - もしくは単に、ディレクトリ(`vat-front-autotest`)を、ローカルに配置してください。
- ディレクトリに移動します。
  - `cd ./vat-front-autotest`
- 必要なライブラリをダウンロードします。
  - `npm install`

## Install
- フロント購入を行うアカウントのユーザIDとパスワードを設定します。
  - `vat-front-autotest/config/test.json`
- テストを実行します。
  - `npm test`


