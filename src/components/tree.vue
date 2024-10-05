<template>
	<div :class="isBranchColumns ? 'branch-box-column-nodes' : 'nodes'">
		<div
			v-for="(node, nodeKey) in nodes"
			:key="node.id"
			class="node"
			:class="[`is-${node.nodeTypeCode}`, node.isDefaultBranchNode ? 'is-default' : '']"
		>
			<!-- 分支节点 -->
			<div v-if="node.isBranches" class="branches debuggable-items">
				<div class="debuggable-item">{{ node.id }}</div>
				<div :id="node.id" class="branch">
					<div class="branch-box">
						<div
							v-if="ApproveFlow.isInvalidBranchesPath(node)"
							class="branch-box-top-line"
							:style="ApproveFlow.getBranchesErrorLineStyle(node)"
							@mouseenter="ApproveFlow.invalidPathFocus"
							@mouseleave="ApproveFlow.invalidPathBlur"
						>
							<div class="branch-box-line is-invalid-branches-path"></div>
						</div>
						<div class="add-branch undraggable" @click.stop="ApproveFlow.addCondition(node, nodeKey, nodes, isBranchColumns)">
							添加条件
						</div>
						<div
							v-for="(branch, branchKey) in node.branches"
							:key="branchKey"
							class="branch-box-column debuggable-items"
							:class="{ 'is-invalid-branch-path': ApproveFlow.isInvalidBranchPath(branch) }"
						>
							<div
								class="branch-box-column-v-line"
								@mouseenter="ApproveFlow.invalidPathFocus"
								@mouseleave="ApproveFlow.invalidPathBlur"
							>
								<div class="branch-box-column-line"></div>
							</div>
							<div class="debuggable-item">{{ branch.id }}</div>
							<template v-if="branchKey === 0">
								<div class="top-left-line"></div>
								<div class="bottom-left-line"></div>
							</template>
							<template v-else-if="branchKey === node.branches.length - 1">
								<div class="top-right-line"></div>
								<div class="bottom-right-line"></div>
							</template>
							<ApproveFlowTree
								:nodes="branch.nodes"
								:parent-nodes="nodes"
								:parent-branch="branch"
								:parent-branch-key="branchKey"
								:parent-node="node"
								:parent-node-key="nodeKey"
								is-branch-columns
							/>
						</div>
						<div
							v-if="ApproveFlow.isInvalidBranchesPath(node)"
							class="branch-box-bottom-line"
							:style="ApproveFlow.getBranchesErrorLineStyle(node)"
							@mouseenter="ApproveFlow.invalidPathFocus"
							@mouseleave="ApproveFlow.invalidPathBlur"
						>
							<div class="branch-box-line is-invalid-branches-path"></div>
						</div>
					</div>
				</div>
			</div>
			<!-- 结束节点 -->
			<div v-else-if="node.isEndNode" class="node-box debuggable-items undraggable">
				<div class="debuggable-item">{{ node.id }}</div>
				<div
					class="line-end-arrow"
					:class="{ 'is-invalid-path': ApproveFlow.isInvalidPath(node) }"
					@mouseenter="ApproveFlow.invalidPathFocus"
					@mouseleave="ApproveFlow.invalidPathBlur"
				></div>
				<span>{{ node.placeholder }}</span>
			</div>
			<!-- 其它节点 -->
			<div
				v-else
				:id="node.id"
				class="node-box debuggable-items undraggable"
				:class="{ 'is-invalid-node': ApproveFlow.isInvalidNode(node), 'hover-priority': node.hoverPriority }"
				@click.stop="ApproveFlow.showNodeSetting(node)"
			>
				<div class="debuggable-item">{{ node.id }}</div>
				<span
					v-if="node.isApproverNode || node.isNotifierNode"
					v-show="ApproveFlow.canMoveNodeUp(node, nodeKey, nodes)"
					class="node-move node-move-up"
					@click.stop="ApproveFlow.moveNodeUp(node, nodeKey, nodes)"
					title="向上移动节点"
				></span>
				<span
					v-if="node.isConditionNode"
					v-show="ApproveFlow.canMoveBranchLeft(parentBranch, parentBranchKey, parentNode)"
					class="node-move node-move-left"
					@click.stop="ApproveFlow.moveBranchLeft(parentBranch, parentBranchKey, parentNode)"
					@mouseenter="node.hoverPriority = 1"
					@mouseleave="node.hoverPriority = 0"
					title="向左移动分支"
				></span>
				<div
					v-if="!node.isStartNode"
					class="line-end-arrow"
					:class="{ 'is-invalid-path': ApproveFlow.isInvalidPath(node) }"
					@mouseenter="ApproveFlow.invalidPathFocus"
					@mouseleave="ApproveFlow.invalidPathBlur"
				></div>
				<div class="node-title" :title="node.title">
					<div v-show="!node.titleEditing" class="node-title-text">{{ node.title }}</div>
					<div v-if="node.isConditionNode" v-show="!node.titleEditing" class="node-title-priority">优先级{{ node.priority }}</div>
					<div
						v-if="!node.isStartNode && !(node.isDefaultBranchNode && node.isConditionNode)"
						v-show="node.titleEditing"
						class="node-title-input"
					>
						<input v-model="node.title" @blur="ApproveFlow.hideTitleEditing(node)" @click.stop="" />
					</div>
					<div v-if="!node.isStartNode" class="node-title-action">
						<div v-show="!(node.isDefaultBranchNode && node.isConditionNode) && !node.titleEditing" class="node-title-action-box">
							<!-- Edit Title -->
							<div class="node-title-action-item" @click.stop="ApproveFlow.showTitleEditing(node)">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
								</svg>
							</div>
						</div>
						<div class="node-title-action-box">
							<!-- Copy：条件仅有 -->
							<div
								v-if="node.isConditionNode"
								class="node-title-action-item"
								@click.stop="ApproveFlow.copyBranch(parentBranch, parentBranchKey, parentNode)"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
								</svg>
							</div>
							<!-- Remove：申请人节点删除分支；审核人 或 抄送人节点删除自身 -->
							<div
								class="node-title-action-item"
								@click.stop="
									node.isConditionNode
										? ApproveFlow.removeBranch(parentBranch, parentBranchKey, parentNode, parentNodeKey, parentNodes)
										: ApproveFlow.removeNode(node, nodeKey, nodes, isBranchColumns)
								"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
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
					</div>
					<div v-show="ApproveFlow.isInvalidNode(node)" class="node-title-error">
						<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg">
							<g fill="none" fill-rule="evenodd">
								<circle fill="currentColor" cx="9" cy="9" r="9" />
								<path
									d="M7.62 4.412c-.102-.924.558-1.673 1.49-1.673.925 0 1.592.75 1.49 1.673l-.652 5.866H8.272l-.651-5.866zm1.49 11.069a1.675 1.675 0 110-3.35 1.675 1.675 0 010 3.35z"
									fill="#FFF"
								/>
							</g>
						</svg>
					</div>
				</div>
				<div class="node-content" :title="node.content">
					<div v-if="node.content" class="node-content-list">
						<div v-for="(content, key) in node.content.split(',')" :key="key" class="node-content-text">{{ content }}</div>
					</div>
					<div v-else class="node-content-text">{{ node.placeholder }}</div>
					<div v-if="!node.isDefaultBranchNode" class="node-content-icon">
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
							<polyline points="9 18 15 12 9 6"></polyline>
						</svg>
					</div>
				</div>
				<span
					v-if="node.isApproverNode || node.isNotifierNode"
					v-show="ApproveFlow.canMoveNodeDown(node, nodeKey, nodes)"
					class="node-move node-move-down"
					@click.stop="ApproveFlow.moveNodeDown(node, nodeKey, nodes)"
					title="向下移动节点"
				></span>
				<span
					v-if="node.isConditionNode"
					v-show="ApproveFlow.canMoveBranchRight(parentBranch, parentBranchKey, parentNode)"
					class="node-move node-move-right"
					@click.stop="ApproveFlow.moveBranchRight(parentBranch, parentBranchKey, parentNode)"
					@mouseenter="node.hoverPriority = 1"
					@mouseleave="node.hoverPriority = 0"
					title="向右移动分支"
				></span>
			</div>
			<!-- 添加按钮 -->
			<div v-if="!node.isEndNode" class="add-node">
				<div class="add-node-v-line" @mouseenter="ApproveFlow.invalidPathFocus" @mouseleave="ApproveFlow.invalidPathBlur">
					<div class="add-node-line" :class="{ 'is-invalid-path': ApproveFlow.isInvalidPath(node) }"></div>
				</div>
				<div class="add-node-btn undraggable">
					<div
						class="add-node-btn-box"
						@click.stop="ApproveFlow.showNodeAction($event, node, nodeKey, nodes, parentNodeKey, parentNodes, isBranchColumns)"
						@mouseenter="ApproveFlow.invalidPathHover = true"
						@mouseleave="ApproveFlow.invalidPathHover = false"
					>
						<span class="add-node-btn-icon"></span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'ApproveFlowTree',
	inject: ['ApproveFlow'],
	props: {
		nodes: Array,
		parentNodes: Array,
		parentBranch: Object,
		parentBranchKey: Number,
		parentNode: Object,
		parentNodeKey: Number,
		isBranchColumns: Boolean
	}
}
</script>
