<template>
	<div id="ApproveFlow-node-action" class="node-action">
		<div class="node-action-box">
			<a href="#addApprover" class="node-action-item node-action-approver" @click.stop.prevent="ApproveFlow.addApprover">
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
					<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
					<circle cx="12" cy="7" r="4"></circle>
				</svg>
				<span>审批人</span>
			</a>
			<a href="#addNotifier" class="node-action-item node-action-notifier" @click.stop.prevent="ApproveFlow.addNotifier">
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
					<polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
				</svg>
				<span>抄送人</span>
			</a>
			<a
				v-if="ApproveFlow.canAddBranches"
				href="#addBranch"
				class="node-action-item node-action-branch"
				@click.stop.prevent="ApproveFlow.addBranch"
			>
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
					<line x1="6" y1="3" x2="6" y2="15"></line>
					<circle cx="18" cy="6" r="3"></circle>
					<circle cx="6" cy="18" r="3"></circle>
					<path d="M18 9a9 9 0 0 1-9 9"></path>
				</svg>
				<span>条件分支</span>
			</a>
		</div>
	</div>
</template>

<script>
export default {
	name: 'ApproveFlowNodeAction',
	inject: ['ApproveFlow']
}
</script>
