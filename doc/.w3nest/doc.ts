import { generateApiFiles } from '../../src/mkapi-backends/mkapi-typescript'

generateApiFiles({
    projectFolder: `${__dirname}/../../`,
    outputFolder: `${__dirname}/../assets/api`,
    baseNav: '/api',
    externals: {
        'rx-vdom': ({ name }: { name: string }) => {
            return `/apps/@rx-vdom/doc/latest?nav=/api.${name}`
        },
        typescript: ({ name }: { name: string }) => {
            const urls = {
                Promise: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
                HTMLElement: 'https://www.typescriptlang.org/docs/handbook/dom-manipulation.html',
                Record: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type',
                Pick: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys',
                MouseEvent: 'https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent',
                Partial: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype',
                Omit: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys',
                window: 'https://developer.mozilla.org/en-US/docs/Web/API/Window',
                HTMLHeadingElement: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLHeadingElement',
                Set: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set',
                ClassMethodDecoratorContext: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html'
            }
            if (!(name in urls)) {
                console.warn(`Can not find URL for typescript ${name} symbol`)
            }
            return urls[name]
        },
        rxjs: ({ name }: { name: string }) => {
            const urls = {
                Subject: 'https://www.learnrxjs.io/learn-rxjs/subjects/subject',
                BehaviorSubject:
                    'https://www.learnrxjs.io/learn-rxjs/subjects/subject',
                ReplaySubject:
                    'https://www.learnrxjs.io/learn-rxjs/subjects/replaysubject',
                Observable: 'https://rxjs.dev/guide/observable',
                combineLatest:
                    'https://rxjs.dev/api/index/function/combineLatest',
                withLatestFrom:
                    'https://rxjs.dev/api/index/function/withLatestFrom',
                zip: 'https://rxjs.dev/api/index/function/zip',
                from: 'https://www.learnrxjs.io/learn-rxjs/operators/creation/from'
            }
            if (!(name in urls)) {
                console.warn(`Can not find URL for rxjs ${name} symbol`)
            }
            return urls[name]
        },
    },
})
