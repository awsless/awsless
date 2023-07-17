const statsStack = {
    name: 'stats',
    tables: {
        stats: {
            hashKey: 'id',
            fields: {
                id: 'string'
            }
        }
    }
};
const betStack = {
    name: 'bet',
    depends: [statsStack],
    queues: {
        process: 'test/_data/function.ts'
    }
};
const diceStack = {
    name: 'dice',
    depends: [statsStack, betStack],
    stores: ['files'],
    topics: {
        event: 'test/_data/function.ts'
    }
};
const walletStack = {
    name: 'wallet',
    depends: [statsStack],
    functions: {
        bet: 'test/_data/function.ts'
    }
};
const siteStack = {
    name: 'site',
    crons: {
    // name: {
    // 	consumer:
    // 	schedule: 'cron(* * * * * *)'
    // }
    },
    plugins: [
    // bugsnagPlugin({
    // 	key: '',
    // }),
    // svelteSitePlugin({
    // 	name: 'frontend',
    // 	domain: 'LOL',
    // }),
    ]
};
export default {
    name: 'app',
    profile: 'jacksclub',
    region: 'eu-west-1',
    defaults: {},
    stacks: [
        statsStack,
        betStack,
        diceStack,
        walletStack,
        // siteStack,
        // { name: 'blaze' },
        // { name: 'chess' },
        // { name: 'mines' },
        // { name: 'tower' },
        // { name: 'keno' },
        // { name: 'hilo' },
        // { name: 'neon' },
        // { name: 'wheel' },
        // { name: 'plinko' },
        // { name: 'coin-flip' },
        // { name: 'roulette' },
        // { name: 'blackjack' },
        // { name: 'video-poker' },
        // { name: 'sugar-rush' },
        // { name: 'candy-shop' },
    ]
};
