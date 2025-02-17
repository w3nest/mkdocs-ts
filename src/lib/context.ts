import { WindowWithStaticConfig } from './static-config'

/**
 * Labels that categorize log entries.
 */
export type Label =
    | 'Router'
    | 'CompanionRouter'
    | 'Nav'
    | 'View'
    | 'PageView'
    | 'Notebook'
    | 'CodeApi'
    | 'Exec'
    | 'Browser'
/**
 * Log levels indicating severity of an entry.
 */
export type Level = 'Info' | 'Warning' | 'Error'

/**
 * Represents a log entry containing contextual information.
 */
export interface Entry {
    /**
     * Name of the thread, for display purpose.
     */
    threadName: string
    /**
     * Associated context's ID.
     */
    ctxId: string
    /**
     * Associated parent context's ID.
     */
    parentCtxId: string
    /**
     * Labels.
     */
    labels: Label[]
    /**
     * Severity.
     */
    level: Level
    /**
     * Text.
     */
    text: string
    /**
     * Associated data (optional).
     */
    data?: unknown
    /**
     * CallStack.
     */
    callstack: string[]
}
/**
 * Defines a logging reporter interface.
 */
export interface ReporterTrait {
    /**
     * Logs an entry to the designated output.
     * @param entry The log entry to be recorded.
     */
    log(entry: Entry): void
}

/**
 * Console-based log reporter.
 */
export class ConsoleReporter implements ReporterTrait {
    log(entry: Entry) {
        const stack = entry.callstack.reduce((acc, e) => `${acc}.${e}`, '')
        const prefix = entry.callstack.reduce((acc) => `${acc}\t`, '')
        const labels = [...new Set(entry.labels)].reduce(
            (acc, e) => `${acc}#${e}`,
            '',
        )
        const obj: { stack: string; data?: unknown } = { stack }
        if (entry.data !== undefined) {
            obj.data = entry.data
        }
        const text = `[@${entry.threadName}, ${labels}] ${prefix}${entry.text}`
        if (entry.level == 'Info') {
            console.log(text, obj)
        }
        if (entry.level == 'Warning') {
            console.warn(text, obj)
        }
        if (entry.level == 'Error') {
            console.error(text, obj)
        }
    }
}
/**
 * Represents an entry in an in-memory log structure.
 */
export type InMemoryEntry = string | { name: string; entries: InMemoryEntry[] }
/**
 * In-memory log storage for structured logging.
 */
export class InMemoryReporter implements ReporterTrait {
    entries: InMemoryEntry[] = []
    private mapId: Record<string, InMemoryEntry[]> = {}

    log(entry: Entry) {
        if (!(entry.ctxId in this.mapId)) {
            const parent = this.mapId[entry.parentCtxId] ?? this.entries
            const startEntry = {
                name: entry.callstack.slice(-1)[0],
                entries: [],
            }
            parent.push(startEntry)
            this.mapId[entry.ctxId] = startEntry.entries
        }
        this.mapId[entry.ctxId].push(entry.text)
    }
}
/**
 * Defines the structure of a logging context.
 */
export interface ContextTrait {
    /**
     * Log with level `Info`.
     */
    info(text: string, data?: unknown): void
    /**
     * Log with level `Warning`.
     */
    warning(text: string, data?: unknown): void
    /**
     * Log with level `Error`.
     */
    error(text: string, data?: unknown): void
    /**
     * Execute a given function.
     *
     * @param name Function's name.
     * @param meth Function.
     * @param labels Associated labels.
     */
    execute<TReturn>(
        name: string,
        meth: (context: ContextTrait) => TReturn,
        labels?: Label[],
    ): TReturn
    /**
     * Execute a given async function.
     *
     * @param name Function's name.
     * @param meth Async function.
     * @param labels Associated labels.
     */
    executeAsync<TReturn>(
        name: string,
        meth: (context: ContextTrait) => Promise<TReturn>,
        labels?: Label[],
    ): Promise<TReturn>

    /**
     * Start a child context.
     * @param name Function's name.
     * @param labels Associated labels.
     */
    start(name: string, labels?: Label[]): ContextTrait

    /**
     * Trigger exit tasks.
     */
    exit(): void
}

/**
 * Type guard to check if an object implements {@link ContextTrait}.
 *
 * @param obj The object to check.
 * @returns True if obj conforms to {@link ContextTrait}, otherwise false.
 */
export function isContextTrait(obj: unknown): obj is ContextTrait {
    return (
        obj !== null &&
        typeof obj === 'object' &&
        'info' in obj &&
        typeof obj.info === 'function' &&
        'execute' in obj &&
        typeof obj.execute === 'function' &&
        'start' in obj &&
        typeof obj.start === 'function' &&
        'exit' in obj &&
        typeof obj.exit === 'function'
    )
}

/**
 * A no-operation implementation of ContextTrait.
 */
export class NoContext implements ContextTrait {
    info() {
        /*No OP*/
    }
    warning() {
        /*No OP*/
    }
    error() {
        /*No OP*/
    }

    execute<TReturn>(
        _name: string,
        meth: (context: ContextTrait) => TReturn,
        _labels?: Label[],
    ): TReturn {
        return meth(this)
    }
    async executeAsync<TReturn>(
        _name: string,
        meth: (context: ContextTrait) => Promise<TReturn>,
        _labels?: Label[],
    ): Promise<TReturn> {
        return meth(this)
    }
    start(_name: string, _labels?: Label[]): ContextTrait {
        return this
    }
    exit(): void {
        /*No OP*/
    }
}
/**
 * Context class that provides structured logging and execution tracking.
 */
export class Context implements ContextTrait {
    /**
     * To enable the decorator {@link Contextual} use {@link StaticConfig} with `enableContextual: true`.
     */
    static Enabled =
        (window as unknown as WindowWithStaticConfig).mkdocsConfig
            ?.enableContextual ?? false
    public readonly reporters: ReporterTrait[]
    public readonly labels: Label[]
    public readonly threadName: string
    public readonly callstack: string[]

    public readonly id: string
    public readonly parentId: string
    public readonly onExit?: (ctx: ContextTrait) => void

    constructor(params: {
        reporters: ReporterTrait[]
        labels: Label[]
        threadName: string
        callstack: string[]
        parentId?: string
        onExit?: (ctx: ContextTrait) => void
    }) {
        Object.assign(this, params)
        this.id = String(Math.floor(Math.random() * 1e6))
    }

    info(text: string, data?: unknown) {
        this.reporters.forEach((reporter) => {
            reporter.log(this.formatEntry('Info', text, data))
        })
    }
    warning(text: string, data?: unknown) {
        this.reporters.forEach((reporter) => {
            reporter.log(this.formatEntry('Warning', text, data))
        })
    }
    error(text: string, data?: unknown) {
        this.reporters.forEach((reporter) => {
            reporter.log(this.formatEntry('Error', text, data))
        })
    }
    start(name: string, labels?: Label[]) {
        const ctx = new Context({
            reporters: this.reporters,
            threadName: this.threadName,
            parentId: this.id,
            labels: [...this.labels, ...(labels ?? [])],
            callstack: [...this.callstack, name],
            onExit: (ctx) => {
                ctx.info(`<${name}`)
            },
        })
        ctx.info(`>${name}`)
        return ctx
    }
    execute<TReturn>(
        name: string,
        meth: (context: ContextTrait) => TReturn,
        labels?: Label[],
    ): TReturn {
        const ctx = this.start(name, labels)
        const r = meth(ctx)
        ctx.exit()
        return r
    }
    async executeAsync<TReturn>(
        name: string,
        meth: (context: ContextTrait) => Promise<TReturn>,
        labels?: Label[],
    ): Promise<TReturn> {
        const ctx = this.start(name, labels)
        const r = await meth(ctx)
        ctx.exit()
        return r
    }

    exit() {
        if (this.onExit) {
            this.onExit(this)
        }
    }
    private formatEntry(level: Level, text: string, data?: unknown): Entry {
        return {
            threadName: this.threadName,
            labels: this.labels,
            callstack: this.callstack,
            ctxId: this.id,
            parentCtxId: this.parentId,
            level,
            text,
            data,
        }
    }
}

/**
 * Decorator for methods that execute within a given context.
 * This decorator ensures that the method receives a valid context
 * and executes within it, handling both synchronous and asynchronous methods.
 *
 * <note level='warning' title='Important'>
 * To disable the decorator globally, set {@link Context.Enabled} to `false` using {@link StaticConfig}.
 * </note>
 *
 * @param _p
 * @param _p.key Optional function to generate a dynamic name for the context based on arguments.
 * @param _p.labels Optional labels associated with the execution context.
 * @param _p.async Specifies whether the method should be executed asynchronously.
 * @returns A method decorator that wraps the original method with contextual execution.
 */
export function Contextual({
    key,
    labels,
    async,
}: {
    key?: (...args: unknown[]) => string
    labels?: Label[]
    async?: boolean
} = {}) {
    /**
     * I'm not able to properly write type specification for this decorator.
     */
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    return function actualDecorator(
        originalMethod: (...args: unknown[]) => unknown,
        context: ClassMethodDecoratorContext,
    ) {
        const methodName = String(context.name)
        if (!Context.Enabled) {
            return originalMethod
        }
        function replacementMethod(this, ...args) {
            if (!Context.Enabled) {
                return originalMethod.apply(this, [...args, undefined])
            }
            const ctx = args[args.length - 1]
            if (!isContextTrait(ctx)) {
                return originalMethod.apply(this, [...args, undefined])
            }
            let name = methodName
            if (key) {
                name += `(${key(...args)})`
            }
            const params: [
                string,
                (ctx: ContextTrait) => Promise<unknown>,
                Label[] | undefined,
            ] = [
                name,
                (ctx: ContextTrait) => {
                    return originalMethod.apply(this, [
                        ...args.slice(0, -1),
                        ctx,
                    ])
                },
                labels,
            ]
            return async
                ? ctx.executeAsync<unknown>(...params)
                : ctx.execute<unknown>(...params)
        }
        return replacementMethod
    }
}
