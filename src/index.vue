<template>
	<div id="ApproveFlow" class="approve-flow" :class="{ debuggable, draggable, dragging }">
		<ApproveFlowNodeForm />

		<ApproveFlowNodeZoom />

		<div id="ApproveFlow-node-tree" class="node-tree">
			<ApproveFlowTree
				v-if="draggable"
				class="draggable-items"
				:class="{ 'has-invalid-hover': approveFlowNodeHasInvalidHover }"
				:style="`transform:translate3d(${translateX}px,${translateY}px,1px);${zoomStyle}`"
				:nodes="approveFlowTree"
				@contextmenu.native="dragContext"
				@mousedown.native.right="dragStart"
				@mousemove.native="dragMove"
				@mouseup.native="dragEnd"
			/>
			<ApproveFlowTree v-else :style="zoomStyle" :nodes="approveFlowTree" />
		</div>

		<ApproveFlowNodeAction :style="zoomStyle" />

		<ApproveFlowStartSetting>
			<template #start-setting-modal>
				<slot name="start-setting-modal" :node="approveFlowNodeSetting"></slot>
			</template>
		</ApproveFlowStartSetting>

		<ApproveFlowApproverSetting>
			<template #approver-setting-modal>
				<slot name="approver-setting-modal" :node="approveFlowNodeSetting"></slot>
			</template>
		</ApproveFlowApproverSetting>

		<ApproveFlowNotifierSetting>
			<template #notifier-setting-modal>
				<slot name="notifier-setting-modal" :node="approveFlowNodeSetting"></slot>
			</template>
		</ApproveFlowNotifierSetting>

		<ApproveFlowConditionSetting>
			<template #condition-setting-modal>
				<slot name="condition-setting-modal" :node="approveFlowNodeSetting"></slot>
			</template>
		</ApproveFlowConditionSetting>

		<slot></slot>
	</div>
</template>

<script>
import ApproveFlowTree from './components/tree.vue'
import ApproveFlowNodeForm from './components/form.vue'
import ApproveFlowNodeZoom from './components/zoom.vue'
import ApproveFlowNodeAction from './components/action.vue'
import ApproveFlowStartSetting from './components/startSetting.vue'
import ApproveFlowApproverSetting from './components/approverSetting.vue'
import ApproveFlowNotifierSetting from './components/notifierSetting.vue'
import ApproveFlowConditionSetting from './components/conditionSetting.vue'

import {
	getStartNode,
	getConditionNode,
	getApproverNode,
	getNotifierNode,
	getEndNode,
	getBranches
} from './utils/node.js'

const uuid = () => parseInt((Math.random() * 10 ** 10).toString().padStart('0', 10), 10)

const defaultTree = () => ({
	config: {},
	// 注意：这里传入的nodes不包含虚拟的branches，branches是前端为了实现树状渲染而虚拟创建的
	nodes: [],
	lines: []
})

// 无需双向绑定的局部变量
let dragMoved = false,
	dragStarted = false,
	dragAnimateId = null,
	dragAnimateFrames = [],
	dragPointX = 0,
	dragPointY = 0

export default {
	name: 'ApproveFlow',
	components: {
		ApproveFlowTree,
		ApproveFlowNodeForm,
		ApproveFlowNodeZoom,
		ApproveFlowNodeAction,
		ApproveFlowStartSetting,
		ApproveFlowApproverSetting,
		ApproveFlowNotifierSetting,
		ApproveFlowConditionSetting
	},
	props: {
		// 提示的主法，默认使用window.alert
		alert: Function,
		// 确认的方法，默认使用window.confirm
		confirm: Function,
		// 表单提交的方法
		submit: Function,
		// 是否可进行调试
		debuggable: Boolean,
		// 是否能创建分支
		canAddBranches: { type: Boolean, default: true },
		// 是否开启右键拖拽，默认开启
		draggable: { type: Boolean, default: true },
		// 数据加载的方法
		config: { type: Object, default: defaultTree }
	},
	provide() {
		return {
			ApproveFlow: this
		}
	},
	computed: {
		zoomStyle() {
			return this.zoom === 100 ? '' : `zoom:${this.zoom / 100};`
		}
	},
	watch: {
		config: {
			immediate: true,
			handler(newValue, oldValue) {
				if (newValue !== oldValue) {
					this.buildTree()
				}
			}
		}
	},
	beforeDestroy() {
		window.removeEventListener('click', this.clickoutside)
	},
	created() {
		window.addEventListener('click', this.clickoutside, false)
	},
	data() {
		return {
			changed: false,
			zoom: 100,
			dragging: false,
			translateX: 0,
			translateY: 0,
			approveFlowNode: null,
			approveFlowNextNode: null,
			approveFlowParentNodes: null,
			approveFlowBranchNextNode: null,
			approveFlowNodeAction: false,
			approveFlowNodeIndex: null,
			approveFlowNodeList: [],
			approveFlowNodeSetting: null,
			approveFlowNodeEditing: null,
			approveFlowNodeValidating: false,
			approveFlowNodeHasInvalid: false,
			approveFlowNodeHasInvalidHover: false,
			approveFlowStartNode: null,
			approveFlowEndNode: null,
			approveFlowBranches: [],
			approveFlowPaths: [],
			approveFlowNodes: [],
			approveFlowLines: [],
			approveFlowTree: [],
			approveFlowAction: '',
			approveFlowConfig: { title: '...' }
		}
	},
	methods: {
		// 根据nodes和lines构建tree
		buildTree() {
			const { config, nodes, lines } = JSON.parse(JSON.stringify(this.config || {}))
			if (!config || !nodes || !lines) return

			if (!config.title) config.title = '审批流程设置'

			this.changed = !nodes.length

			this.approveFlowNodeValidating = false
			this.approveFlowBranches = []
			this.approveFlowConfig = config
			this.approveFlowNodes = nodes
			this.approveFlowLines = lines
			this.approveFlowAction = this.changed ? 'add' : 'edit'

			// 如果是新建
			if (this.changed) {
				const startNode = this.createStartNode()
				const approverNode = this.createApproverNode(startNode)
				const notifierNode = this.createNotifierNode(approverNode)
				const endNode = this.createEndNode(notifierNode)
				this.approveFlowTree = [startNode, approverNode, notifierNode, endNode]
			}
			// 如果是编辑
			else {
				// 单调栈（类似递归）
				let tree = [],
					node = nodes.find((node) => node.isStartNode),
					queue = [[tree, tree, node]],
					count = 1,
					// 父级节点列表
					parentNodes,
					// 分支节点列表
					branchNodes

				this.approveFlowStartNode = node

				while (count-- > 0 && ([parentNodes, branchNodes, node] = queue.shift())) {
					// 碰到结束节点时继续
					if (node.isEndNode) {
						// 到endNode后继承
						this.approveFlowEndNode = node
						// 一条线走完了 不代表 所有路径全完了，因此不用break
						continue
					}

					// 节点已被访问则继续
					if (node.isVisited) continue

					// 节点有几条向上路径（开始节点没有）
					let prevOne = false
					if (!node.isStartNode && (prevOne = lines.filter((line) => node.id === line.nextNodeId).length === 1)) {
						// 有一条向上路径时加入到分支节点列表
						branchNodes.push(node)
					} else {
						// 有多条向上路径时加入到父级节点列表
						parentNodes.push(node)
					}

					// 节点有几条向下路径
					const nextLines = lines.filter((line) => node.id === line.prevNodeId)
					if (nextLines.length === 1) {
						// 只有一条向下路径时从下个节点开始
						const nextNodeId = nextLines[0].nextNodeId,
							nextNode = nodes.find((node) => node.id === nextNodeId)
						queue.push([parentNodes, branchNodes, nextNode])
						count++
					} else {
						// 节点有多个prevNode时创建虚拟branches进行包装
						const nextNodeIds = nextLines.map((line) => line.nextNodeId),
							conditionNodes = nodes.filter(
								(node) => !node.isVisited && node.isConditionNode && nextNodeIds.includes(node.id)
							)
						if (conditionNodes.length > 0) {
							const branches = this.createBranches()
							if (prevOne) {
								// 有一条向上路径时加入到分支节点列表
								branchNodes.push(branches)
							} else {
								// 有多条向上路径时加入到父级节点列表
								parentNodes.push(branches)
							}
							// 以条件节点开始递归
							conditionNodes
								// 默认节点永远放最右边
								.sort((a, b) => (b.isDefaultBranchNode ? -1 : a.priority - b.priority))
								// 遍历所有条件节点
								.forEach((nextNode, nodeKey) => {
									// 创建分支
									const branch = this.createBranch(null, null, nextNode.isDefaultBranchNode)
									branches.branches.push(branch)
									// 默认条件没有content
									if (nextNode.isDefaultBranchNode) nextNode.content = ''
									// 标记为分支节点
									nextNode.isBranchNode = 1
									// 重新分配优先级
									nextNode.priority = nodeKey + 1
									// 条件节点加入递归
									queue.push([branchNodes, branch.nodes, nextNode])
									count++
								})
						}
					}

					// 标记节点已被访问
					node.isVisited = true
				}

				tree.push(this.approveFlowEndNode)

				this.approveFlowTree = tree
			}
		},
		// 根据nodes和lines构建路径（不包含start和end节点）
		buildPaths() {
			let node = this.approveFlowStartNode,
				queue = [[[], node]],
				count = 1,
				paths = [],
				path

			while (count-- > 0 && ([path, node] = queue.shift()) && node) {
				if (node.isEndNode) {
					// 去掉start节点
					path.shift()
					paths.push(path)
				} else {
					path.push(node)
					const lines = this.approveFlowLines.filter((line) => line.prevNodeId === node.id)
					if (lines.length === 1) {
						const nextNodeId = lines[0].nextNodeId,
							nextNode = this.approveFlowNodes.find((node) => node.id === nextNodeId)
						queue.push([path, nextNode])
						count++
					} else {
						lines.forEach((line) => {
							const nextNode = this.approveFlowNodes.find((node) => node.id === line.nextNodeId),
								nextPath = path.slice(0)
							queue.push([nextPath, nextNode])
							count++
						})
					}
				}
			}

			this.approveFlowPaths = paths
		},
		// 右键：未移动时保留右键菜单
		dragContext(event) {
			if (dragMoved) {
				dragMoved = false
				event.preventDefault()
			}
		},
		// 拖拽开始
		dragStart(event) {
			if (!this.draggable || (event.clientX === dragPointX && event.clientY === dragPointY)) return

			let { target } = event
			while (target) {
				if (target.classList) {
					if (target.classList.contains('undraggable')) return
					if (target.classList.contains('draggable-items')) break
				}
				target = target.parentNode
			}

			dragMoved = false
			dragStarted = true
			this.dragging = false
			dragPointX = event.clientX - this.translateX
			dragPointY = event.clientY - this.translateY
			dragAnimateId = window.requestAnimationFrame(this.dragRun)
		},
		// 执行帧
		dragRun() {
			if (dragStarted) {
				for (let i = 0; i < 60; i++) {
					let frame = dragAnimateFrames.shift()
					if (!frame) break
					let x = frame[0] - dragPointX,
						y = frame[1] - dragPointY
					if (x !== this.translateX) (dragMoved = true), (this.translateX = x)
					if (y !== this.translateY) (dragMoved = true), (this.translateY = y)
					this.dragging = dragMoved
				}
				dragAnimateId = window.requestAnimationFrame(this.dragRun)
			}
		},
		// 拖拽移动：加入帧队列
		dragMove(event) {
			if (dragStarted) {
				dragAnimateFrames.push([event.clientX, event.clientY])
			}
		},
		// 拖拽结束：清空帧队列
		dragEnd() {
			if (dragStarted) {
				this.dragging = false
				dragStarted = false
				dragPointX = 0
				dragPointY = 0
				window.cancelAnimationFrame(dragAnimateId)
				dragAnimateId = null
				dragAnimateFrames = []
			}
		},
		// 拖拽重置
		dragReset() {
			this.dragEnd()
			this.translateX = 0
			this.translateY = 0
		},
		// 创建开始节点（申请人）
		createStartNode() {
			const startNode = getStartNode()
			this.approveFlowStartNode = startNode
			this.approveFlowNodes.push(startNode)
			return startNode
		},
		// 创建条件节点
		createConditionNode(prevNode, nextNode, isDefaultBranchNode = 0, priority = 0) {
			const conditionNode = getConditionNode({
				id: 'condition_' + uuid(),
				priority,
				isDefaultBranchNode,
				// 条件一定是在分支中
				isBranchNode: 1
			})
			this.approveFlowNodes.splice(this.approveFlowNodes.length - 1, 0, conditionNode)
			this.addLine(conditionNode, prevNode, nextNode)
			return conditionNode
		},
		// 创建审批人节点
		createApproverNode(prevNode, nextNode, isDefaultBranchNode = 0, isBranchNode = 0) {
			const approverNode = getApproverNode({ id: 'approver_' + uuid(), isDefaultBranchNode, isBranchNode })
			this.approveFlowNodes.splice(this.approveFlowNodes.length - 1, 0, approverNode)
			this.addLine(approverNode, prevNode, nextNode)
			return approverNode
		},
		// 创建抄送人节点
		createNotifierNode(prevNode, nextNode, isDefaultBranchNode = 0, isBranchNode = 0) {
			const notifierNode = getNotifierNode({ id: 'notifier_' + uuid(), isDefaultBranchNode, isBranchNode })
			this.approveFlowNodes.splice(this.approveFlowNodes.length - 1, 0, notifierNode)
			this.addLine(notifierNode, prevNode, nextNode)
			return notifierNode
		},
		// 创建结束节点
		createEndNode(prevNode) {
			const endNode = getEndNode()
			this.approveFlowEndNode = endNode
			this.approveFlowNodes.push(endNode)
			this.addLine(endNode, prevNode, null)
			return endNode
		},
		// 创建分支节点
		createBranches(leftBranch, rightBranch) {
			const branches = getBranches({
				id: 'branches_' + uuid(),
				branches: leftBranch && rightBranch ? [leftBranch, rightBranch] : []
			})
			this.approveFlowBranches.push(branches)
			return branches
		},
		// 创建分支
		createBranch(prevNode, nextNode, isDefaultBranch = 0, priority = 0, nodes = []) {
			return {
				id: 'branch_' + uuid(),
				isDefaultBranch,
				isBranch: 1,
				nodes: prevNode && nextNode ? this.createBranchNodes(prevNode, nextNode, isDefaultBranch, priority) : nodes
			}
		},
		// 创建分支节点
		createBranchNodes(prevNode, nextNode, isDefaultBranchNode = 0, priority = 0) {
			const conditionNode = this.createConditionNode(prevNode, null, isDefaultBranchNode, priority)
			const approverNode = this.createApproverNode(conditionNode, null, isDefaultBranchNode, 1)
			const notifierNode = this.createNotifierNode(approverNode, nextNode, isDefaultBranchNode, 1)
			return [conditionNode, approverNode, notifierNode]
		},
		// 外部点击处理，处理窗口互斥
		clickoutside() {
			// 触发点击事件 目标元素的真实低级，组件内部判断标识，处理方法
			const triggers = [
				['approveFlowNodeAction', 'hideNodeAction'], // 节点操作窗口 隐藏
				['approveFlowNodeEditing', 'hideTitleEditing'] // 节点标题文本框 重置
			]
			triggers.forEach((trigger) => this[trigger[0]] && this[trigger[1]]())
		},
		// 显示节点操作窗口
		showNodeAction(event, node, key, nodes, parentNodeKey, parentNodes, isBranchColumns) {
			this.hideTitleEditing()

			let { target } = event
			while (!target.classList || !target.classList.contains('add-node-btn')) target = target.parentNode

			this.approveFlowNode = node
			this.approveFlowNodeIndex = key
			this.approveFlowNodeList = nodes

			// 当前节点的下一个节点
			this.approveFlowNextNode = this.getNextNode(key, nodes, isBranchColumns)
			// console.log(this.approveFlowNextNode)

			// 当前节点的下一个分支节点（创建分支使用）
			this.approveFlowBranchNextNode = this.getNextBranchNode(key, nodes, parentNodeKey, parentNodes, isBranchColumns)

			this.approveFlowNodeAction = true

			const action = document.getElementById('ApproveFlow-node-action'),
				aStyle = action.style
			// 先显示，否则offsetHeight为0
			aStyle.display = 'block'
			const height2 = action.offsetHeight / 2,
				{ left, top, width, height } = target.getBoundingClientRect()
			aStyle.top = `${top - height2 + height / 2}px`
			aStyle.left = `${left + width + 10}px`
		},
		// 隐藏节点操作窗口
		hideNodeAction() {
			if (!this.approveFlowNode) return

			this.approveFlowNode = null
			this.approveFlowNodeIndex = null
			this.approveFlowNodeList = []
			this.approveFlowNextNode = null
			this.approveFlowNodeAction = false

			const action = document.getElementById('ApproveFlow-node-action')
			action.style.display = ''
		},
		// 显示节点设置窗口
		showNodeSetting(node) {
			this.hideTitleEditing()

			// 默认条件不能操作
			if (node.isDefaultBranchNode && node.isConditionNode) return

			this.approveFlowNodeSetting = node

			const target = document.getElementById('ApproveFlow-node-tree')
			const scrollbarWidth = target.scrollHeight > target.clientHeight ? 10 : 0

			const modal = document.getElementById(`ApproveFlow-${node.nodeTypeCode}-modal`)
			const container = document.getElementById(`ApproveFlow-${node.nodeTypeCode}-modal-container`)

			target.style.cssText = `overflow:hidden;padding-right:${scrollbarWidth}px;`
			modal.style.display = 'block'
			setTimeout(() => (container.style.right = 0), 0)

			this.$emit('show-node-setting', node)
		},
		// 隐藏节点设置窗口
		hideNodeSetting() {
			const node = this.approveFlowNodeSetting
			if (!node) return

			const target = document.getElementById('ApproveFlow-node-tree')
			const modal = document.getElementById(`ApproveFlow-${node.nodeTypeCode}-modal`)
			const container = document.getElementById(`ApproveFlow-${node.nodeTypeCode}-modal-container`)

			target.style.cssText = ''
			container.style.right = '-30%'
			setTimeout(
				() => (
					(modal.style.display = 'none'), (this.approveFlowNodeSetting = null), this.$emit('hide-node-setting', node)
				),
				350 + 1
			)
		},
		// 显示标题编辑
		showTitleEditing(node) {
			if (this.approveFlowNodeEditing) this.approveFlowNodeEditing.titleEditing = 0
			node.titleEditing = 1
			this.approveFlowNodeEditing = node
			this.hideNodeAction()
		},
		// 隐藏标题编辑
		hideTitleEditing(node) {
			node = node || this.approveFlowNodeEditing
			if (node) node.titleEditing = 0
			this.approveFlowNodeEditing = null
		},
		// 获取所有分支的节点id列表
		collectNodes(node, callback) {
			// 单调栈兜底
			let queue = node.slice ? node.slice(0) : [node],
				count = queue.length,
				results = []
			while (count-- > 0 && (node = queue.shift())) {
				if (node.isBranches) {
					// 如果是分支节点
					for (let branch of node.branches) {
						count += branch.nodes.length
						queue.push(...branch.nodes)
					}
				} else if (node.isBranch) {
					// 如果是分支
					count += node.nodes.length
					queue.push(...node.nodes)
				} else {
					// 如果是节点
					let result = callback(node)
					result && results.push(result)
				}
			}
			return results
		},
		// 遍历所有分支的首节点
		collectFirstNodes(node, callback) {
			// 单调栈兜底
			let queue = node.slice ? node.slice(0) : [node],
				count = queue.length,
				results = []
			while (count-- > 0 && (node = queue.shift())) {
				if (node.isBranches) {
					// 如果是分支，放入所有分支的尾节点
					for (let branch of node.branches) {
						queue.push(branch.nodes[0])
						count++
					}
				} else if (node.isBranch) {
					// 如果是分支
					queue.push(node.nodes[0])
					count++
				} else {
					// 如果是节点
					let result = callback(node)
					result && results.push(result)
				}
			}
			return results
		},
		// 遍历所有分支的首节点
		collectLastNodes(node, callback) {
			// 单调栈兜底
			let queue = node.slice ? node.slice(0) : [node],
				count = queue.length,
				results = []
			while (count-- > 0 && (node = queue.shift())) {
				if (node.isBranches) {
					// 如果是分支列表，放入所有分支的尾节点
					for (let branch of node.branches) {
						queue.push(branch.nodes[branch.nodes.length - 1])
						count++
					}
				} else if (node.isBranch) {
					// 如果是分支
					queue.push(node.nodes[node.nodes.length - 1])
					count++
				} else {
					// 如果是节点
					let result = callback(node)
					result && results.push(result)
				}
			}
			return results
		},
		// 获取所有分支的节点id列表
		getAllNodeIdList(node) {
			return this.collectNodes(node, (node) => node.id)
		},
		// 获取所有分支的首节点id列表
		getFirstNodeIdList(node) {
			return this.collectFirstNodes(node, (node) => node.id)
		},
		// 获取所有分支的末节点id列表
		getLastNodeIdList(node) {
			return this.collectLastNodes(node, (node) => node.id)
		},
		// 获取某个节点的任意分支的最后节点id
		getLastNodeId(node) {
			return this.getLastNodeIdList(node).pop()
		},
		// 获取某个节点的下一个节点
		getNextNode(key, nodes, isBranchColumns) {
			if (isBranchColumns && nodes.length - 1 === key) {
				// 如果是末尾的分支，那么它任意分支的末尾节点的下个节点就是当前的下个节点
				const lastNodeId = this.getLastNodeId(nodes[key])
				return this.approveFlowLines.reduce(
					(nodes, line) =>
						line.prevNodeId === lastNodeId
							? nodes.concat(this.approveFlowNodes.find((row) => row.id === line.nextNodeId))
							: nodes,
					[]
				)
			}
			return nodes[key + 1]
		},
		// 获取某个节点的下一个分支节点（创建分支使用）
		getNextBranchNode(key, nodes, parentNodeKey, parentNodes, isBranchColumns) {
			if (isBranchColumns) {
				// 如果是在分支中
				let parentLastKey = parentNodes.length - 1
				if (parentLastKey === parentNodeKey) {
					// 如果是末尾的分支，那么它任意分支的末尾节点的下个节点就是当前的下个节点
					const lastNodeId = this.getLastNodeId(parentNodes[parentNodeKey])
					return this.approveFlowLines.reduce(
						(nodes, line) =>
							line.prevNodeId === lastNodeId
								? nodes.concat(this.approveFlowNodes.find((row) => row.id === line.nextNodeId))
								: nodes,
						[]
					)
				}
				return parentNodes[parentNodeKey + 1]
			}
			return nodes[nodes.length - 1]
		},
		// 新增关系
		addLine(node, prevNode, nextNode) {
			if (prevNode) {
				// 如果是分支，将 分支下的所有末节点 与 当前节点 相连
				let nextNodeIdList = this.getFirstNodeIdList(node)
				this.collectLastNodes(prevNode, (prevNode) =>
					nextNodeIdList.forEach((nextNodeId) => this.approveFlowLines.push({ prevNodeId: prevNode.id, nextNodeId }))
				)
				this.changed = true
			}
			if (nextNode) {
				// 如果是分支，将 当前节点 与 分支下的所有首节点 相连
				let prevNodeIdList = this.getLastNodeIdList(node)
				this.collectFirstNodes(nextNode, (nextNode) =>
					prevNodeIdList.forEach((prevNodeId) => this.approveFlowLines.push({ prevNodeId, nextNodeId: nextNode.id }))
				)
				this.changed = true
			}
		},
		// 交换两个节点之间的关系（nextNode不能是分支）
		swapLine(node, nextNode) {
			this.approveFlowLines.forEach((line) => {
				const { prevNodeId, nextNodeId } = line
				if (prevNodeId === node.id && nextNodeId === nextNode.id) {
					// 交换两者之间的关系
					line.prevNodeId = nextNode.id
					line.nextNodeId = node.id
				} else {
					// nextNode的prev关系更新为node
					if (prevNodeId === nextNode.id) line.prevNodeId = node.id
					// node的next关系更新为nextNode
					if (nextNodeId === node.id) line.nextNodeId = nextNode.id
				}
			})
			this.changed = true
		},
		// 添加关系，来自复制分支
		addLineFromCopyBranch(node) {
			// 如果是分支，单调栈兜底
			let queue = node.slice ? node.slice(0) : [node],
				count = queue.length,
				copiedNodeIds = {}

			while (count-- > 0 && (node = queue.shift())) {
				// 生成新的对应id
				const newNodeId = node.nodeTypeCode + '_' + uuid()
				if (node.isBranches) {
					// 如果是分支节点
					for (let branch of node.branches) {
						count += branch.nodes.length
						queue.push(...branch.nodes)
					}
				} else if (node.isBranch) {
					// 如果是分支
					count += node.nodes.length
					queue.push(...node.nodes)
				} else {
					copiedNodeIds[node.id] = newNodeId
				}
				node.id = newNodeId
			}

			// 复制数据
			let nodes = this.approveFlowNodes.slice(0)
			for (let nodeId in copiedNodeIds) {
				let newNode = nodes.find((node) => node.id === nodeId)
				if (newNode) this.approveFlowNodes.push({ ...newNode, id: copiedNodeIds[nodeId] })
			}

			// 复制关系
			this.approveFlowLines.forEach((line) => {
				let prevIn = line.prevNodeId in copiedNodeIds
				let nextIn = line.nextNodeId in copiedNodeIds
				if (prevIn || nextIn) {
					let newLine = { ...line }
					if (prevIn) newLine.prevNodeId = copiedNodeIds[line.prevNodeId]
					if (nextIn) newLine.nextNodeId = copiedNodeIds[line.nextNodeId]
					this.approveFlowLines.push(newLine)
				}
			})

			this.changed = true
		},
		// 删除关系，来自添加分支
		removeLineFromAddBranch(branch, direction) {
			let removedNodeIds = direction === 'prev' ? this.getLastNodeIdList(branch) : this.getFirstNodeIdList(branch),
				idField = direction + 'NodeId'
			// 删除关系
			this.approveFlowLines = this.approveFlowLines.filter((line) => !removedNodeIds.includes(line[idField]))
			this.changed = true
		},
		// 删除关系，来自移除分支
		removeLineFromRemoveBranch(branch) {
			let removedNodeIds = this.getAllNodeIdList(branch)
			// 删除数据
			this.approveFlowNodes = this.approveFlowNodes.filter((row) => !removedNodeIds.includes(row.id))
			// 删除关系
			this.approveFlowLines = this.approveFlowLines.filter(
				(line) => !(removedNodeIds.includes(line.prevNodeId) || removedNodeIds.includes(line.nextNodeId))
			)
			this.changed = true
		},
		// 删除关系，来自移除节点
		removeLineFromRemoveNode(node, key, nodes, isBranchColumns) {
			const nextNode = key > 0 ? this.getNextNode(key, nodes, isBranchColumns) : null
			// 删除数据
			this.approveFlowNodes = this.approveFlowNodes.filter((row) => row.id !== node.id)
			// 删除关系
			this.approveFlowLines = this.approveFlowLines.filter(
				(line) => !(line.prevNodeId === node.id || line.nextNodeId === node.id)
			)
			// 关系继承
			if (nextNode) this.addLine(nodes[key - 1], null, nextNode)
			this.changed = true
		},
		// 删除两个连续的节点之间的关系（nextNode可以是分支），来自添加节点
		removeLineFromAddNode(node, nextNode) {
			const removedPrevNodeIds = this.getLastNodeIdList(node),
				removedNextNodeIds = this.getFirstNodeIdList(nextNode)
			// 删除由removedPrevNodeIds开始，removedNextNodeIds结束的关系
			this.approveFlowLines = this.approveFlowLines.filter(
				(line) => !(removedPrevNodeIds.includes(line.prevNodeId) && removedNextNodeIds.includes(line.nextNodeId))
			)
			this.changed = true
		},
		// 节点是否可以向上移动（不是在首位）
		canMoveNodeUp(node, key, nodes) {
			if (key === 0) return false
			// 排除分支节点和开始节点
			const noBranchNodes = nodes.slice(1).filter((node) => !node.isBranches && !node.isStartNode)
			return noBranchNodes[0].id !== node.id
		},
		// 节点是否可以向下移动（不是在末位）
		canMoveNodeDown(node, key, nodes) {
			if (key === 0) return false
			// 排除分支节点和结束节点
			const noBranchNodes = nodes.slice(1).filter((node) => !node.isBranches && !node.isEndNode)
			return noBranchNodes[noBranchNodes.length - 1].id !== node.id
		},
		// 向上移动节点
		moveNodeUp(node, key, nodes) {
			this.hideTitleEditing()
			this.hideNodeAction()

			this.swapLine(nodes[key - 1], nodes[key])

			nodes.splice(key, 1)
			nodes.splice(key - 1, 0, node)
		},
		// 向下移动节点
		moveNodeDown(node, key, nodes) {
			this.hideTitleEditing()
			this.hideNodeAction()

			this.swapLine(node, nodes[key + 1])

			nodes.splice(key, 1)
			nodes.splice(key + 1, 0, node)
		},
		// 分支是否可以向左移动（不是在首位）
		canMoveBranchLeft(branch, branchKey) {
			return !branch.isDefaultBranch && branchKey !== 0
		},
		// 分支是否可以向右移动（不是在末位）
		canMoveBranchRight(branch, branchKey, { branches }) {
			return !branch.isDefaultBranch && branchKey !== branches.length - 2
		},
		// 向左移动分支
		moveBranchLeft(branch, branchKey, { branches }) {
			this.hideTitleEditing()
			this.hideNodeAction()
			this.closeValidate()

			const currentConditionNode = branch.nodes[0],
				leftConditionNode = branches[branchKey - 1].nodes[0]

			currentConditionNode.hoverPriority = 0
			currentConditionNode.priority -= 1

			leftConditionNode.hoverPriority = 1
			leftConditionNode.priority += 1

			branches.splice(branchKey, 1)
			branches.splice(branchKey - 1, 0, branch)
		},
		// 向右移动分支
		moveBranchRight(branch, branchKey, { branches }) {
			this.hideTitleEditing()
			this.hideNodeAction()
			this.closeValidate()

			const currentConditionNode = branch.nodes[0],
				rightConditionNode = branches[branchKey + 1].nodes[0]

			currentConditionNode.hoverPriority = 0
			currentConditionNode.priority += 1

			rightConditionNode.hoverPriority = 1
			rightConditionNode.priority -= 1

			branches.splice(branchKey, 1)
			branches.splice(branchKey + 1, 0, branch)
		},
		// 打开验证
		openValidate() {
			this.approveFlowNodeValidating = true
		},
		// 关闭验证
		closeValidate() {
			this.approveFlowNodeValidating = false
		},
		// 获取分支的错误路径样式
		getBranchesErrorLineStyle(branches) {
			if (!this.approveFlowNodeValidating) return ''

			if (!branches.errorLineStyle) {
				let branchesEl = document.getElementById(branches.id),
					lineLeft = branchesEl.clientWidth,
					lineWidth = 0,
					branchesX = lineLeft / 2

				// 1. 遍历所有分支
				for (let branch of branches.branches) {
					// 2. 条件节点为无效路径
					let conditionNode = branch.nodes[0]
					if (conditionNode.isInvalidPath) {
						let branchEl = document.getElementById(conditionNode.id)
						while (
							(branchEl = branchEl.parentNode) &&
							(!branchEl.classList || !branchEl.classList.contains('branch-box-column'))
						);
						let branchX = branchEl.offsetLeft + branchEl.clientWidth / 2
						lineLeft = branchesX > branchX ? Math.min(branchX, lineLeft) : Math.min(branchesX, lineLeft)
						lineWidth = Math.max(Math.abs(lineLeft - Math.max(branchX, branchesX)), lineWidth)
					}
				}

				branches.errorLineStyle = 'width: ' + (lineWidth + 2) + 'px; left: ' + (lineLeft - 1) + 'px'
			}

			return branches.errorLineStyle
		},
		// 更新节点信息
		updateNodeInfo(node, info) {
			let changed = false

			// 比较其它值是否变化
			for (let key in info) {
				if (key !== 'data' && node[key] !== info[key]) {
					node[key] = info[key]
					changed = true
				}
			}

			// 对象变化忽略键位顺序
			if (!changed) {
				let infoData = Object.keys(info.data)
						.sort()
						.reduce((str, key) => (str += key + '#' + JSON.stringify(info.data[key])), ''),
					nodeData = Object.keys(node.data)
						.sort()
						.reduce((str, key) => (str += key + '#' + JSON.stringify(node.data[key])), '')
				changed = infoData !== nodeData
			}

			// 数据变化了验证节点
			if (changed) {
				node.data = { ...info.data }

				this.changed = true
				this.validateNode(node)
			}
		},
		// 验证所有节点填写状态
		validate() {
			let isInvalidNode = this.invalidRule(this.approveFlowStartNode),
				// 1: 存在验证没通过的节点
				// 2: 存在没有审批人节点的路径
				isInvalidPath = 0

			// 验证开始节点
			this.approveFlowStartNode.isInvalidNode = isInvalidNode

			// 重置所有分支的路径状态
			for (let branches of this.approveFlowBranches) {
				branches.errorLineStyle = ''
				branches.isInvalidPath = null
				for (let branch of branches.branches) {
					branch.isInvalidPath = null
				}
			}

			// 构建路径
			this.approveFlowNodeValidating || this.buildPaths()
			this.openValidate()

			// 收集无效路径
			let invalidPaths = []
			if (this.approveFlowPaths.some((path) => path.some(this.invalidRule))) {
				// 存在无效路径
				for (let path of this.approveFlowPaths) {
					if (path.some(this.invalidRule)) {
						// 路径上有一个节点验证不通过
						isInvalidPath = 1
						invalidPaths.push(path)
					} else {
						// 路径上所有节点验证通过
						for (let pathNode of path) {
							pathNode.isInvalidNode = false
							pathNode.isInvalidPath = false
						}
					}
				}
			} else {
				// 不存在无效路径
				for (let path of this.approveFlowPaths) {
					// 路径中必须包含一个审批人
					if (!path.some((node) => node.isApproverNode)) {
						isInvalidPath = 2
						invalidPaths.push(path)
					} else {
						// 路径上所有节点验证通过
						for (let pathNode of path) {
							pathNode.isInvalidNode = false
							pathNode.isInvalidPath = false
						}
					}
				}
			}

			if (isInvalidPath) {
				isInvalidNode = true
				for (let path of invalidPaths) {
					for (let pathNode of path) {
						pathNode.isInvalidNode = this.invalidRule(pathNode)
						pathNode.isInvalidPath = true
					}
				}
			}

			// 所有路径只要有一条验证未通过，那么标记开始和结束节点为无效路径
			this.approveFlowStartNode.isInvalidPath = isInvalidPath > 0
			this.approveFlowEndNode.isInvalidPath = isInvalidPath > 0

			this.approveFlowNodeHasInvalid = isInvalidNode

			return [!isInvalidNode, isInvalidPath]
		},
		// 验证某个节点
		validateNode(node) {
			return this.approveFlowNodeValidating ? this.validate() : [!(node.isInvalidNode = this.invalidRule(node)), 0]
		},
		// 验证规则
		invalidRule(node) {
			return node.isDefaultBranchNode && node.isConditionNode ? false : !node.content
		},
		// 无效路径聚焦
		invalidPathFocus() {
			if (this.approveFlowNodeHasInvalid) this.approveFlowNodeHasInvalidHover = true
		},
		// 无效路径失信
		invalidPathBlur() {
			this.approveFlowNodeHasInvalidHover = false
		},
		// 验证节点是否无效
		isInvalidNode(node) {
			return this.approveFlowNodeValidating && node.isInvalidNode
		},
		// 验证路径是否无效
		isInvalidPath(node) {
			if (!this.approveFlowNodeValidating) return false
			// 如果已验证
			if (node.isInvalidPath != null) return node.isInvalidPath
			// 如果是分支
			if (node.isBranch) return this.isInvalidPathBranch(node)
			// 如果是分支节点
			if (node.isBranches) return this.isInvalidBranchesPath(node)
			// 如果是节点
			return node.isInvalidPath
		},
		// 验证分支节点路径是否无效
		isInvalidBranchesPath(branches) {
			if (!this.approveFlowNodeValidating) return false
			// 如果已验证
			if (branches.isInvalidPath != null) return branches.isInvalidPath
			// 验证所有分支
			return (branches.isInvalidPath = branches.branches.some(this.isInvalidBranchPath))
		},
		// 验证分支路径是否无效
		isInvalidBranchPath(branch) {
			if (!this.approveFlowNodeValidating) return false
			// 如果已验证
			if (branch.isInvalidPath != null) return branch.isInvalidPath
			// 如果条件节点为无效路径
			return (branch.isInvalidPath = branch.nodes.some((node) => node.isInvalidPath))
		},
		// 复制分支
		copyBranch(branch, branchKey, parentNode) {
			this.closeValidate()
			this.hideTitleEditing()

			// 使用JSON解藕
			const newBranch = JSON.parse(JSON.stringify(branch))
			const newConditionNode = newBranch.nodes[0]
			if (newBranch.isDefaultBranch) {
				// 默认分支在分支前插入
				newConditionNode.title = '条件' + (branchKey + 1)
				newConditionNode.content = '选择条件'
				newBranch.isDefaultBranch = 0
				// 清除默认节点标记
				for (let node of newBranch.nodes) {
					if (node.isDefaultBranchNode) {
						node.isDefaultBranchNode = 0
					}
				}
			} else {
				// 非默认分支在分支后插入
				branchKey++
				newConditionNode.title += '（复制）'
			}

			// 复制关系
			this.addLineFromCopyBranch(newBranch)

			// 在下位插入
			const { branches } = parentNode
			branches.splice(branchKey, 0, newBranch)

			// 更新条件优先级：下标+1
			for (let i = branchKey, l = branches.length; i < l; i++) {
				branches[i].nodes[0].priority = i + 1
			}
		},
		// 删除分支
		async removeBranch(branch, branchKey, parentNode, parentNodeKey, parentNodes, isBranchColumns) {
			this.hideTitleEditing()

			// 删除确认
			let message = '该条件下的所有节点及分支都将删除，确定继续？'
			if (this.confirm) {
				let confirm = await this.confirm(message)
				if (!confirm) return
			} else if (!window.confirm(message)) {
				return
			}

			// 关闭验证
			this.closeValidate()

			// 删除关系
			this.removeLineFromRemoveBranch(branch)

			// 删除分支
			const { branches } = parentNode
			branches.splice(branchKey, 1)

			// 如果分支只剩1个，将分支 转化为 节点
			if (branches.length == 1) {
				const { nodes } = branches[0]

				// 删除关系
				this.removeLineFromRemoveNode(nodes[0], 0, nodes, isBranchColumns)

				// 删除条件，分支首节点必为条件
				nodes.shift()

				if (nodes.length > 0) {
					// 关系修正
					this.addLine(nodes[0], parentNodes[parentNodeKey - 1])
					// 替换分支
					parentNodes.splice(parentNodeKey, 1, ...nodes)
				} else {
					// 删除分支
					parentNodes.splice(parentNodeKey, 1)
					// 删除分支节点
					const branchesIndex = this.approveFlowBranches.findIndex((_branches) => _branches.id === branches.id)
					this.approveFlowBranches.splice(branchesIndex, 1)
				}
			} else {
				// 更新条件优先级：下标+1
				for (let i = branchKey, l = branches.length; i < l; i++) {
					branches[i].nodes[0].priority = i + 1
				}
			}
		},
		// 删除节点
		removeNode(node, key, nodes, isBranchColumns) {
			this.closeValidate()
			this.hideTitleEditing()

			// 删除关系
			this.removeLineFromRemoveNode(node, key, nodes, isBranchColumns)

			// 删除节点
			nodes.splice(key, 1)
		},
		// 添加条件（key一定不为0）
		addCondition(node, key, nodes, isBranchColumns) {
			this.closeValidate()
			this.hideTitleEditing()
			this.hideNodeAction()

			// 在默认分支前插入（默认分支一定会有）
			const { branches } = node,
				priority = branches.length,
				leftBranch = this.createBranch(nodes[key - 1], this.getNextNode(key, nodes, isBranchColumns), 0, priority)

			branches[priority - 1].nodes[0].priority = priority + 1

			// 默认分支一定是在最后的
			branches.splice(priority - 1, 0, leftBranch)
		},
		// 添加审批人
		addApprover() {
			this.closeValidate()
			this.hideTitleEditing()

			// 由于在2个节点中间插入了新的节点，会影响这2个节点的关系，因此需要删除关系
			this.removeLineFromAddNode(this.approveFlowNode, this.approveFlowNextNode)

			this.approveFlowNodeList.splice(
				this.approveFlowNodeIndex + 1,
				0,
				this.createApproverNode(
					this.approveFlowNode,
					this.approveFlowNextNode,
					this.approveFlowNode.isDefaultBranchNode || 0,
					this.approveFlowNode.isBranchNode || 0
				)
			)

			this.hideNodeAction()
		},
		// 添加抄送人
		addNotifier() {
			this.closeValidate()
			this.hideTitleEditing()

			// 由于在2个节点中间插入了新的节点，会影响这2个节点的关系，因此需要删除关系
			this.removeLineFromAddNode(this.approveFlowNode, this.approveFlowNextNode)

			this.approveFlowNodeList.splice(
				this.approveFlowNodeIndex + 1,
				0,
				this.createNotifierNode(
					this.approveFlowNode,
					this.approveFlowNextNode,
					this.approveFlowNode.isDefaultBranchNode || 0,
					this.approveFlowNode.isBranchNode || 0
				)
			)

			this.hideNodeAction()
		},
		// 添加分支
		addBranch() {
			this.closeValidate()
			this.hideTitleEditing()

			// 第1层的end节点先拿出来
			const { isEndNode } = this.approveFlowNodeList[this.approveFlowNodeList.length - 1]
			const endNode = isEndNode ? this.approveFlowNodeList.pop() : null

			// 右分支节点
			let rightBranchNodes = this.approveFlowNodeList.splice(this.approveFlowNodeIndex + 1)
			if (rightBranchNodes.length > 0) {
				// 所有节点标记为默认节点
				rightBranchNodes.forEach((node) => ((node.isBranchNode = 1), (node.isDefaultBranchNode = 1)))
				// 有节点时，删除从到当前下一个节点的关系
				this.removeLineFromAddBranch(rightBranchNodes[0], 'next')
				// 剩余节点合并到默认分支中，添加首节点（条件）
				rightBranchNodes.unshift(this.createConditionNode(this.approveFlowNode, rightBranchNodes[0], 1, 2))
			} else {
				// 没有节点则创建，删除从当前节点出发的关系
				this.removeLineFromAddBranch(this.approveFlowNode, 'prev')
				// 创建默认分支的节点
				rightBranchNodes = this.createBranchNodes(this.approveFlowNode, this.approveFlowBranchNextNode, 1, 2)
			}

			// 左分支：新的分支。上面有removeLine，这里要放下面
			const leftBranch = this.createBranch(this.approveFlowNode, this.approveFlowBranchNextNode, 0, 1)

			// 右分支：默认分支
			const rightBranch = this.createBranch(null, null, 1, 2, rightBranchNodes)

			// 在原来的节点位置之前插入分支
			this.approveFlowNodeList.splice(this.approveFlowNodeIndex + 1, 0, this.createBranches(leftBranch, rightBranch))

			// 保证第一层的end节点在最后
			if (endNode) this.approveFlowNodeList.push(endNode)

			this.hideNodeAction()
		}
	}
}
</script>

<style lang="scss">
@import './assets/index.scss';
</style>
