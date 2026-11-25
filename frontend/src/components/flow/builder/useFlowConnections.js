import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDefaultCondition, getValidConditions } from '../flowConditions'
import {
  createOnConnectHandler,
  createAddConnectionHandler,
  createOnNodesDeleteHandler,
  resolveEdgeConditionOptions,
} from './flowBuilderEdges'

export function useFlowConnections({
  nodes,
  edges,
  setEdges,
  mode,
  isLocked,
  setSelectedNodeId,
  addToast,
}) {
  const [newConnSource, setNewConnSource] = useState('')
  const [newConnTarget, setNewConnTarget] = useState('')
  const [newConnCondition, setNewConnCondition] = useState('DEFAULT')

  const onConnect = useCallback(
    (connection) =>
      createOnConnectHandler({ nodes, setEdges, mode, addToast })(connection),
    [setEdges, nodes, mode, addToast],
  )

  const setEdgeCondition = useCallback(
    (edgeId, condition) => {
      if (isLocked) return
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId ? { ...e, label: condition, data: { ...e.data, condition } } : e,
        ),
      )
    },
    [setEdges, isLocked],
  )

  const removeEdge = useCallback(
    (edgeId) => {
      if (isLocked) return
      setEdges((eds) => eds.filter((e) => e.id !== edgeId))
    },
    [setEdges, isLocked],
  )

  const newConnSourcePageType = useMemo(() => {
    const node = nodes.find((n) => n.id === newConnSource)
    return node?.data?.pageType || ''
  }, [nodes, newConnSource])

  const newConnConditionOptions = useMemo(
    () => getValidConditions(newConnSourcePageType, mode),
    [newConnSourcePageType, mode],
  )

  useEffect(() => {
    if (!newConnSourcePageType) return
    const defaultCondition = getDefaultCondition(newConnSourcePageType, mode)
    const timer = setTimeout(() => {
      setNewConnCondition(defaultCondition)
    }, 0)
    return () => clearTimeout(timer)
  }, [newConnSourcePageType, mode])

  const addConnection = useCallback(
    () =>
      createAddConnectionHandler({
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
      })(),
    [
      nodes,
      newConnSource,
      newConnTarget,
      newConnCondition,
      newConnSourcePageType,
      mode,
      edges,
      setEdges,
      addToast,
      isLocked,
    ],
  )

  const onNodesDelete = useCallback(
    (deleted) =>
      createOnNodesDeleteHandler({ setEdges, setSelectedNodeId, addToast })(deleted),
    [setEdges, setSelectedNodeId, addToast],
  )

  const getEdgeConditionOptions = useCallback(
    (sourceId, currentCondition) =>
      resolveEdgeConditionOptions(nodes, mode, sourceId, currentCondition),
    [nodes, mode],
  )

  return {
    newConnSource,
    setNewConnSource,
    newConnTarget,
    setNewConnTarget,
    newConnCondition,
    setNewConnCondition,
    newConnSourcePageType,
    newConnConditionOptions,
    onConnect,
    setEdgeCondition,
    removeEdge,
    addConnection,
    onNodesDelete,
    getEdgeConditionOptions,
  }
}
