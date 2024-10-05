<template>
	<div id="ApproveFlow-node-form" class="node-form">
		<h3>
			<span>{{ ApproveFlow.approveFlowConfig.title }}</span>
		</h3>
		<h2>审批流程设置</h2>
		<div class="node-form-group">
			<button class="btn-cancel" @click.stop="onCancel">取消</button>
			<button class="btn-submit" @click.stop="onSubmit">提交</button>
		</div>
	</div>
</template>

<script>
export default {
	name: 'ApproveFlowNodeForm',
	inject: ['ApproveFlow'],
	methods: {
		onCancel() {
			this.ApproveFlow.$emit('cancel')
		},
		onSubmit() {
			const {
				changed,
				alert = window.alert,
				validate,
				submit,
				approveFlowConfig,
				approveFlowLines,
				approveFlowNodes
			} = this.ApproveFlow
			const [validated, isInvalidPath] = validate()
			if (!validated) {
				return alert(
					isInvalidPath === 1
						? '审批流程存在错误的节点，请检查标记为红色的节点，修复后再试'
						: '审批流程没有审批人节点，请检查标记为红色的路径中是否包含审批人节点，修复后再试'
				)
			}
			if (!changed) {
				return alert('审批流程数据未发现变化，无需提交')
			}
			submit({
				config: approveFlowConfig,
				lines: approveFlowLines,
				nodes: approveFlowNodes,
				links: approveFlowNodes.reduce((links, node) => {
					const nextNodeIds = node.isEndNode
						? []
						: approveFlowLines.filter((line) => line.prevNodeId === node.id).map((line) => line.nextNodeId)
					const prevNodeIds = node.isStartNode
						? []
						: approveFlowLines.filter((line) => line.nextNodeId === node.id).map((line) => line.prevNodeId)
					if (nextNodeIds.length > 0 && prevNodeIds.length > 0) {
						for (let nextNodeId of nextNodeIds) {
							for (let prevNodeId of prevNodeIds) {
								links.push({
									nodeId: node.id,
									prevNodeId,
									nextNodeId
								})
							}
						}
					} else if (nextNodeIds.length > 0) {
						for (let nextNodeId of nextNodeIds) {
							links.push({
								nodeId: node.id,
								prevNodeId: null,
								nextNodeId
							})
						}
					} else if (prevNodeIds.length > 0) {
						for (let prevNodeId of prevNodeIds) {
							links.push({
								nodeId: node.id,
								prevNodeId,
								nextNodeId: null
							})
						}
					}
					return links
				}, [])
			})
		}
	}
}
</script>
