import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { layoutDocument } from '@/domain/layout/logical'
import { createBlankDocument, createTopic } from '@/domain/model/document'
import { resolveTheme } from '@/domain/theme'

import TopicNodeView from './TopicNodeView.vue'

function thirdLevelNode(shape?: 'underline') {
  const doc = createBlankDocument()
  const child = createTopic('Child')
  const grandchild = createTopic('Tab 创建子主题')
  if (shape) grandchild.style = { shape }
  child.children.push(grandchild)
  doc.root.children.push(child)

  const layout = layoutDocument(doc, resolveTheme('classic'))
  const node = layout.nodes.find((item) => item.depth === 2)
  if (!node) throw new Error('missing third-level node')
  return node
}

describe('TopicNodeView', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('keeps all four borders on third-level topics', () => {
    const wrapper = mount(TopicNodeView, {
      props: {
        node: thirdLevelNode(),
        selected: false,
        editing: false,
        theme: resolveTheme('classic'),
      },
      global: { plugins: [pinia] },
    })

    const element = wrapper.element as HTMLElement
    expect(element.style.borderTopWidth).toBe('1.5px')
    expect(element.style.borderBottomWidth).toBe('1.5px')
  })

  it('uses only a bottom border for underline topics', () => {
    const wrapper = mount(TopicNodeView, {
      props: {
        node: thirdLevelNode('underline'),
        selected: false,
        editing: false,
        theme: resolveTheme('classic'),
      },
      global: { plugins: [pinia] },
    })

    const element = wrapper.element as HTMLElement
    expect(element.style.borderTopStyle).toBe('none')
    expect(element.style.borderBottomWidth).toBe('2px')
  })
})
