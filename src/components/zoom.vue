<template>
	<div id="ApproveFlow-node-zoom" class="node-zoom">
		<button class="node-zoom-decr" @click.stop="decr" :disabled="ApproveFlow.zoom == 50" />
		<div class="node-zoom-text" @click.stop="ApproveFlow.zoom = 100" title="点击重置">{{ ApproveFlow.zoom }}%</div>
		<button class="node-zoom-incr" @click.stop="incr" :disabled="ApproveFlow.zoom == 200" />
	</div>
</template>

<script>
export default {
	name: 'ApproveFlowNodeZoom',
	inject: ['ApproveFlow'],
	methods: {
		incr() {
			if (this.ApproveFlow.zoom != 200) this.ApproveFlow.zoom += 10
		},
		decr() {
			if (this.ApproveFlow.zoom != 50) this.ApproveFlow.zoom -= 10
		}
	}
}
</script>
