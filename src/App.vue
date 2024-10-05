<template>
	<div id="app">
		<ApproveFlow
			:submit="onSumbit"
			:confirm="customConfirm"
			:alert="customAlert"
			:config="approveFlowConfig"
			:can-add-branches="canAddBranches"
			@cancel="onCancel"
			@show-node-setting="onShowNodeSetting"
			@hide-node-setting="onHideNodeSetting"
		>
			<!-- 申请人设置 -->
			<template slot="start-setting-modal" slot-scope="{ node }">
				<p>申请人设置</p>
				<p>{{ node }}</p>
			</template>
			<!-- 条件设置 -->
			<template slot="condition-setting-modal" slot-scope="{ node }">
				<p>条件设置</p>
				<p>{{ node }}</p>
			</template>
			<!-- 审批人设置 -->
			<template slot="approver-setting-modal" slot-scope="{ node }">
				<p>审批人设置</p>
				<p>{{ node }}</p>
			</template>
			<!-- 抄送人设置 -->
			<template slot="notifier-setting-modal" slot-scope="{ node }">
				<p>审批人设置</p>
				<p>{{ node }}</p>
			</template>
		</ApproveFlow>
	</div>
</template>

<script>
import ApproveFlow from './index.vue'

export default {
	components: {
		ApproveFlow
	},
	data() {
		return {
			// 是否可创建分支
			canAddBranches: true,
			// 审批流配置
			approveFlowConfig: {
				config: {
					title: '请假流程'
				},
				// 节点列表
				nodes: [],
				// 关系列表
				lines: []
			}
		}
	},
	methods: {
		onSumbit(data) {
			console.log('审批流数据：', data)
		},
		onCancel() {
			console.log('取消按钮的回调')
		},
		onShowNodeSetting(node) {
			console.log('显示节点设置窗口：', node)
		},
		onHideNodeSetting(node) {
			console.log('隐藏节点设置窗口：', node)
		},
		customConfirm() {
			console.log('自定义确认提示方法')
			return true
		},
		customAlert() {
			console.log('自定义弹窗提示方法')
			return true
		}
	}
}
</script>

<style scoped>
#app {
	overflow: hidden;
}
</style>
