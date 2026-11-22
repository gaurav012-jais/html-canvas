import { addEdge } from '@xyflow/react'
import { getDefaultCondition, getValidConditions } from '../flowConditions'
import { START_NODE_ID, isMetaNodeId } from '../startConfig'

export function createOnConnectHandler({ nodes, setEdges, mode, addToast }) {
  return (connection) => {
    const sourceNode = nodes.find((n) => n.id === connection.source)
    const sourcePageType = sourceNode?.data?.pageType || connection.source
    const condition = getDefaultCondition(sourcePageType, mode)

    setEdges((eds) => {
      const duplicate = eds.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          (e.data?.condition || 'DEFAULT') === condition,
      )
      if (duplicate) {
        addToast('This connection already exists', 'error')
        return eds
      }
      return addEdge(
        {
          ...connection,
          id: `${connection.source}-${condition}-${connection.target}-${Date.now()}`,
          label: condition,
          animated: true,
          data: { condition },
        },
        eds,
      )
    })
  }
}

export function createAddConnectionHandler({
  nodes,
  edges,
  setEdges,
  newConnSource,
  newConnTarget,
  newConnCondition,
  newConnSourcePageType,
  mode,
  addToast,
  isLocked,
}) {
  return () => {
    if (isLocked) return
    if (!newConnSource || !newConnTarget) {
      addToast('Select both From and To pages', 'error')
      return
    }
    if (newConnSource === newConnTarget) {
      addToast('From and To must be different pages', 'error')
      return
    }

    const condition = newConnCondition || getDefaultCondition(newConnSourcePageType, mode)
    const duplicate = edges.some(
      (e) =>
        e.source === newConnSource &&
        e.target === newConnTarget &&
        (e.data?.condition || 'DEFAULT') === condition,
    )
    if (duplicate) {
      addToast('This connection already exists', 'error')
      return
    }

    setEdges((eds) => [
      ...eds,
      {
        id: `${newConnSource}-${condition}-${newConnTarget}-${Date.now()}`,
        source: newConnSource,
        target: newConnTarget,
        label: condition,
        animated: true,
        data: { condition },
      },
    ])
    addToast('Connection added', 'success')
  }
}

export function createOnNodesDeleteHandler({ setEdges, setSelectedNodeId, addToast }) {
  return (deleted) => {
    const metaDeleted = deleted.some((n) => isMetaNodeId(n.id))
    if (metaDeleted) {
      addToast('START and END cannot be removed', 'error')
      return
    }
    const ids = new Set(deleted.map((n) => n.id))
    setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)))
    setSelectedNodeId(null)
    addToast('Page removed from flow', 'success')
  }
}

export function resolveEdgeConditionOptions(nodes, mode, sourceId, currentCondition) {
  if (isMetaNodeId(sourceId)) {
    const fixed = sourceId === START_NODE_ID ? 'AFTER_CHECKS' : 'DONE'
    return currentCondition && currentCondition !== fixed
      ? [currentCondition, fixed]
      : [fixed]
  }
  const sourceNode = nodes.find((n) => n.id === sourceId)
  const valid = getValidConditions(sourceNode?.data?.pageType || sourceId, mode)
  if (currentCondition && !valid.includes(currentCondition)) {
    return [currentCondition, ...valid]
  }
  return valid
}
