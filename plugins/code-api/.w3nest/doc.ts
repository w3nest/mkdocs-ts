import { generateApiFiles } from '../src/mkapi-backends/mkapi-typescript'

const externals: any = {
    'rx-vdom': ({ name }: { name: string }) => {
        return `/apps/@rx-vdom/doc/latest?nav=/api.${name}`
    },
    typescript: ({ name }: { name: string }) => {
        const urls = {
            Promise:
                'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
            HTMLElement:
                'https://www.typescriptlang.org/docs/handbook/dom-manipulation.html',
            Record: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type',
            Pick: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys',
            MouseEvent:
                'https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent',
            Partial:
                'https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype',
            Omit: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys',
            window: 'https://developer.mozilla.org/en-US/docs/Web/API/Window',
            HTMLHeadingElement:
                'https://developer.mozilla.org/en-US/docs/Web/API/HTMLHeadingElement',
            Set: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set',
            ClassMethodDecoratorContext:
                'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html',
            DOMRect: 'https://developer.mozilla.org/en-US/docs/Web/API/DOMRect',
            ScrollToOptions:
                'https://developer.mozilla.org/fr/docs/Web/API/Window/scrollTo',
        }
        if (!(name in urls)) {
            console.warn(`Can not find URL for typescript's '${name}' symbol`)
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
            combineLatest: 'https://rxjs.dev/api/index/function/combineLatest',
            withLatestFrom:
                'https://rxjs.dev/api/index/function/withLatestFrom',
            zip: 'https://rxjs.dev/api/index/function/zip',
            from: 'https://www.learnrxjs.io/learn-rxjs/operators/creation/from',
        }
        if (!(name in urls)) {
            console.warn(`Can not find URL for rxjs's '${name}' symbol`)
        }
        return urls[name]
    },
    'mkdocs-ts': ({ name }: { name: string }) => {
        const urls = {
            Router: '@nav[mkdocs-ts].Router',
            Navigation: '@nav[mkdocs-ts].Navigation',
            NavNodeData: '@nav[mkdocs-ts].NavNodeData',
            ContextTrait: '@nav[mkdocs-ts].ContextTrait',
            MdParsingOptions: '@nav[mkdocs-ts].MdParsingOptions',
            ViewGenerator: '@nav[mkdocs-ts].ViewGenerator',
            AnyView: '@nav[mkdocs-ts].AnyView',
            ClientTocView: '@nav[mkdocs-ts]/DefaultLayout.ClientTocView',
            NavLayoutView: '@nav[mkdocs-ts]/DefaultLayout.NavLayoutView',
            NavLayout: '@nav[mkdocs-ts]/DefaultLayout.NavLayout',
            'DefaultLayout.NavLayout':
                '@nav[mkdocs-ts]/DefaultLayout.NavLayout',
            NavHeader: '@nav[mkdocs-ts]/DefaultLayout.NavHeader',
            'DefaultLayout.NavHeader':
                '@nav[mkdocs-ts]/DefaultLayout.NavHeader',
        }

        if (!(name in urls)) {
            console.warn(`Can not find URL for mkdocs-ts's '${name}' symbol`)
        }
        return urls[name]
    },
}

generateApiFiles({
    projectFolder: `${__dirname}/..`,
    outputFolder: `${__dirname}/../assets/api`,
    externals,
})
