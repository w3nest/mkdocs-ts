import {
    AnyVirtualDOM,
    ChildrenLike,
    VirtualDOM,
    ChildLike,
    RxChild,
    attr$,
    child$,
} from 'rx-vdom'
import { BehaviorSubject } from 'rxjs'

/**
 * Represents an expandable widget, featuring:
 * * An horizontal customizable header
 * * The content when expanded
 *
 * This view is registered in {@link GlobalMarkdownViews}: it can be instantiated from Markdown using the tag
 * `expandable`. See constructor's documentation for details regarding its parameters.
 */
export class ExpandableGroupView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly class = 'w-100 rounded border py-1 px-2 my-1'

    public readonly children: ChildrenLike

    /**
     * Initializes a new instance.
     *
     * @param _args The arguments.
     * @param _args.title Title displayed in the header.
     * Provided as attribute `title` when instantiated from MarkDown.
     * @param _args.icon Icon displayed in the header. An instance of `string` is used as class of a `div` element.
     * Provided as attribute `icon` when instantiated from MarkDown (only string supported).
     * @param _args.content Content displayed when the widget is expanded.
     * Provided as the HTMLElement's `textContent` when instantiated from MarkDown.
     * @param _args.expanded Initial state. Provided as attribute `expanded` when instantiated from MarkDown.
     * @param _args.mode Whether to preserve the state of the content when expanding/hidding.
     */
    constructor({
        title,
        icon,
        content,
        expanded,
        mode,
    }: {
        title: string | ChildLike
        icon: string | AnyVirtualDOM
        content: () => AnyVirtualDOM
        mode?: 'stateful' | 'stateless'
        expanded?: boolean
    }) {
        const expanded$ = new BehaviorSubject(expanded || false)
        mode = mode || 'stateless'
        const header: AnyVirtualDOM = {
            tag: 'div',
            class: attr$({
                source$: expanded$,
                vdomMap: (expanded): string =>
                    expanded ? 'border-bottom' : '',
                wrapper: (d) => `${d} d-flex align-items-center`,
            }),
            children: [
                typeof icon === 'string'
                    ? {
                          tag: 'i',
                          class: icon,
                      }
                    : icon,
                {
                    tag: 'div',
                    class: 'mx-2',
                },
                typeof title === 'string'
                    ? {
                          tag: 'div',
                          innerText: title,
                      }
                    : title,
                {
                    tag: 'div',
                    class: 'flex-grow-1',
                },
                {
                    tag: 'i',
                    class: attr$({
                        source$: expanded$,
                        vdomMap: (expanded): string =>
                            expanded ? 'fa-chevron-down' : 'fa-chevron-right',
                        wrapper: (d) =>
                            `${d} fas fv-pointer fv-hover-text-focus`,
                    }),
                    onclick: () => expanded$.next(!expanded$.value),
                },
            ],
        }
        const wrapperClass = 'pt-2'
        const innerContent: AnyVirtualDOM | RxChild =
            mode === 'stateless'
                ? child$({
                      source$: expanded$,
                      vdomMap: (expanded) => {
                          if (expanded) {
                              return {
                                  tag: 'div',
                                  class: wrapperClass,
                                  children: [content()],
                              }
                          }
                          return { tag: 'div' }
                      },
                  })
                : {
                      tag: 'div' as const,
                      class: attr$({
                          source$: expanded$,
                          vdomMap: (expanded) => {
                              if (expanded) {
                                  return wrapperClass
                              }
                              return 'd-none'
                          },
                      }),
                      children: [content()],
                  }
        this.children = [header, innerContent]
    }
}
