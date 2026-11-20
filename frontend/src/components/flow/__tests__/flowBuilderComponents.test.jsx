import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlowSelectedNodeCard } from '../builder/FlowSelectedNodeCard'
import { FlowPagesCard } from '../builder/FlowPagesCard'
import { FlowConnectionsCard } from '../builder/FlowConnectionsCard'
import { FlowStartChecksCard } from '../builder/FlowStartChecksCard'
import { FlowModeOptions } from '../summary/FlowModeOptions'

describe('FlowSelectedNodeCard', () => {
  it('calls editNode with pageType and editQuery', () => {
    const editNode = vi.fn()
    const removeNode = vi.fn()
    const selectedNode = {
      id: 'OTP_NUMBER',
      data: {
        label: 'Mobile Number',
        pageType: 'OTP',
        editQuery: { step: 'number' },
      },
    }

    render(
      <FlowSelectedNodeCard
        selectedNode={selectedNode}
        editNode={editNode}
        removeNode={removeNode}
        isLocked={false}
      />
    )

    const editBtn = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editBtn)
    expect(editNode).toHaveBeenCalledWith('OTP', { step: 'number' })
  })

  it('hides delete button when isLocked is true', () => {
    const editNode = vi.fn()
    const removeNode = vi.fn()
    const selectedNode = {
      id: 'OTP_NUMBER',
      data: {
        label: 'Mobile Number',
        pageType: 'OTP',
      },
    }

    const { rerender } = render(
      <FlowSelectedNodeCard
        selectedNode={selectedNode}
        editNode={editNode}
        removeNode={removeNode}
        isLocked={true}
      />
    )

    expect(screen.queryByTitle(/remove from flow/i)).toBeNull()

    rerender(
      <FlowSelectedNodeCard
        selectedNode={selectedNode}
        editNode={editNode}
        removeNode={removeNode}
        isLocked={false}
      />
    )
    expect(screen.getByTitle(/remove from flow/i)).toBeTruthy()
  })
})

describe('FlowPagesCard', () => {
  it('passes editQuery when clicking pencil icon on page pill', () => {
    const editNode = vi.fn()
    const addNode = vi.fn()
    const pageNodes = [
      {
        id: 'OTP_NUMBER',
        data: {
          label: 'Mobile Number',
          pageType: 'OTP',
          editQuery: { step: 'number' },
        },
      },
    ]

    render(
      <FlowPagesCard
        pageNodes={pageNodes}
        existingPageTypes={new Set(['OTP'])}
        selectedNodeId={null}
        setSelectedNodeId={vi.fn()}
        editNode={editNode}
        addNode={addNode}
        mode="BOTH"
        isLocked={false}
      />
    )

    const pencilBtn = screen.getByTitle('Edit')
    fireEvent.click(pencilBtn)
    expect(editNode).toHaveBeenCalledWith('OTP', { step: 'number' })
  })

  it('disables add page buttons when isLocked is true', () => {
    const addNode = vi.fn()
    render(
      <FlowPagesCard
        pageNodes={[]}
        existingPageTypes={new Set(['HOME'])}
        selectedNodeId={null}
        setSelectedNodeId={vi.fn()}
        editNode={vi.fn()}
        addNode={addNode}
        mode="BOTH"
        isLocked={true}
      />
    )

    const buttons = screen.getAllByRole('button')
    const addBtns = buttons.filter((b) => b.textContent && b.textContent.includes('OTP'))
    expect(addBtns.length).toBeGreaterThan(0)
    expect(addBtns[0]).toBeDisabled()
  })
})

describe('FlowStartChecksCard', () => {
  it('disables checkboxes when isLocked is true', () => {
    const patchStartConfig = vi.fn()
    render(
      <FlowStartChecksCard
        mode="BOTH"
        startConfig={{ runHe: true, runBlocklist: true, runChecksub: false }}
        patchStartConfig={patchStartConfig}
        isLocked={true}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach((cb) => {
      expect(cb).toBeDisabled()
    })
  })
})

describe('FlowConnectionsCard', () => {
  it('disables add connection button and delete buttons when isLocked is true', () => {
    const edges = [
      {
        id: 'e1',
        source: 'HOME',
        target: 'OTP',
        data: { condition: 'DEFAULT' },
      },
    ]

    render(
      <FlowConnectionsCard
        pageNodes={[{ id: 'HOME', data: { label: 'Home' } }, { id: 'OTP', data: { label: 'OTP' } }]}
        edges={edges}
        newConnSource="HOME"
        setNewConnSource={vi.fn()}
        newConnTarget="OTP"
        setNewConnTarget={vi.fn()}
        newConnCondition="DEFAULT"
        setNewConnCondition={vi.fn()}
        newConnConditionOptions={['DEFAULT']}
        addConnection={vi.fn()}
        removeEdge={vi.fn()}
        setEdgeCondition={vi.fn()}
        getEdgeConditionOptions={() => ['DEFAULT']}
        nodeLabel={(id) => id}
        isLocked={true}
      />
    )

    const addBtn = screen.getByRole('button', { name: /add connection/i })
    expect(addBtn).toBeDisabled()
    expect(screen.queryByTitle(/delete connection/i)).toBeNull()
  })
})

describe('FlowModeOptions', () => {
  it('disables mode options when isLocked is true', () => {
    render(
      <FlowModeOptions
        draftMode="OTP_ONLY"
        draftEntry="HOME"
        setDraftEntry={vi.fn()}
        draftAfterIdentity="HOME"
        setDraftAfterIdentity={vi.fn()}
        isLocked={true}
      />
    )

    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })
})
