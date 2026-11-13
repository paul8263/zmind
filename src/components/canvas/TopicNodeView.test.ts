import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { layoutDocument } from '@/domain/layout/logical'
import { createBlankSheet, createTopic } from '@/domain/model/document'
import type { Marker } from '@/domain/model/types'
import { resolveTheme } from '@/domain/theme'

import TopicNodeView from './TopicNodeView.vue'

function thirdLevelNode(shape?: 'underline', markers?: Marker[]) {
  const doc = createBlankSheet()
  const child = createTopic('Child')
  const grandchild = createTopic('Tab 创建子主题')
  if (shape) grandchild.style = { shape }
  if (markers) grandchild.markers = markers
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

  it('renders markers inside the topic', () => {
    const node = thirdLevelNode(undefined, [
      { type: 'solid', color: 'red' },
      { type: 'priority', color: 'blue', value: '2' },
    ])
    const wrapper = mount(TopicNodeView, {
      props: {
        node,
        selected: false,
        editing: false,
        theme: resolveTheme('classic'),
      },
      global: { plugins: [pinia] },
    })

    expect(wrapper.find('[data-node-markers]').exists()).toBe(true)
    expect(wrapper.findAll('[data-marker-icon]')).toHaveLength(2)
  })

  it('places markers before the topic text', () => {
    const node = thirdLevelNode(undefined, [{ type: 'solid', color: 'red' }])
    const wrapper = mount(TopicNodeView, {
      props: {
        node,
        selected: false,
        editing: false,
        theme: resolveTheme('classic'),
      },
      global: { plugins: [pinia] },
    })

    const container = wrapper.element as HTMLElement
    const markerGroup = container.querySelector('[data-node-markers]')
    const text = Array.from(container.children).find((child) => child.tagName === 'SPAN')

    expect(markerGroup).not.toBeNull()
    expect(text).toBeDefined()
    if (!markerGroup || !text) throw new Error('missing marker group or topic text')

    expect(markerGroup.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('emits a context menu request for the node', async () => {
    const node = thirdLevelNode()
    const wrapper = mount(TopicNodeView, {
      props: {
        node,
        selected: false,
        editing: false,
        theme: resolveTheme('classic'),
      },
      global: { plugins: [pinia] },
    })

    await wrapper.trigger('contextmenu')

    expect(wrapper.emitted('contextmenu')?.[0]?.[0]).toBe(node.id)
  })
})
