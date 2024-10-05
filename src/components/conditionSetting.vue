<template>
	<div id="ApproveFlow-condition-modal" class="approve-flow-modal approve-flow-drawer" @click.stop="">
		<div class="approve-flow-modal-mask"></div>
		<div id="ApproveFlow-condition-modal-container" class="approve-flow-modal-container approve-flow-drawer-container">
			<div class="approve-flow-modal-header">
				<span>{{ ApproveFlow.approveFlowNodeSetting && ApproveFlow.approveFlowNodeSetting.nodeTypeName }}设置</span>
				<div class="approve-flow-modal-close" @click.stop="ApproveFlow.hideNodeSetting">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</div>
			</div>
			<div class="approve-flow-modal-content">
				<slot name="condition-setting-modal" />
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'ApproveFlowConditionSetting',
	inject: ['ApproveFlow']
}
</script>
