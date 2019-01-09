
//all: Wait 600s = 10m
//operation: Wait 60s = 1m
global.TIMEOUT = {
    all: 1200 * 1000,
    operation: 120 * 1000
};

jest.setTimeout(global.TIMEOUT.all);
