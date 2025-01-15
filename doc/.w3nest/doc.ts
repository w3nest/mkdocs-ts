import { generateApiFiles } from '../../src/backends/ts-typedoc/typedoc-parser'

generateApiFiles({
    projectFolder: `${__dirname}/../../`,
    outputFolder: `${__dirname}/../assets/api`,
    baseNav: '/api',
    externals: {
        'rx-vdom': ({ name }: { name: string }) => {
            return `/apps/@rx-vdom/doc/latest?nav=/api.${name}`
        },
        rxjs: ({ name }: { name: string }) => {
            const urls = {
                Subject: 'https://www.learnrxjs.io/learn-rxjs/subjects/subject',
                BehaviorSubject:
                    'https://www.learnrxjs.io/learn-rxjs/subjects/subject',
                ReplaySubject:
                    'https://www.learnrxjs.io/learn-rxjs/subjects/replaysubject',
                Observable: 'https://rxjs.dev/guide/observable',
            }
            if (!(name in urls)) {
                console.warn(`Can not find URL for rxjs ${name} symbol`)
            }
            return urls[name]
        },
    },
})
