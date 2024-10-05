export const getBranches = (extendBranches) =>
	Object.assign(
		{
			id: 'branches',
			isBranches: 1,
			isInvalidPath: null,
			nodeTypeCode: 'branches',
			nodeTypeName: '分支',
			branches: [],
			errorLineStyle: ''
		},
		extendBranches
	)

export const getBranch = (extendBranch) =>
	Object.assign(
		{
			id: 'branch',
			isDefaultBranch: 0,
			isBranch: 1,
			isInvalidPath: null,
			nodes: []
		},
		extendBranch
	)

export const getStartNode = (extendNode) =>
	Object.assign(
		{
			id: 'start',
			priority: 0,
			isStartNode: 1,
			isInvalidNode: null,
			isInvalidPath: null,
			title: '申请人',
			placeholder: '选择申请人',
			content: '',
			nodeTypeCode: 'start',
			nodeTypeName: '申请人',
			data: {}
		},
		extendNode
	)

export const getConditionNode = (extendNode) =>
	Object.assign(
		{
			id: 'condition',
			priority: 0,
			hoverPriority: 0,
			isDefaultBranchNode: 0,
			isBranchNode: 0,
			isConditionNode: 1,
			isInvalidNode: null,
			isInvalidPath: null,
			title: extendNode.isDefaultBranchNode ? '默认条件' : '条件' + (extendNode.priority || '1'),
			titleEditing: 0,
			placeholder: extendNode.isDefaultBranchNode ? '未满足其他条件分支的情况，将使用默认流程' : '选择条件',
			content: '',
			nodeTypeCode: 'condition',
			nodeTypeName: '条件',
			data: {}
		},
		extendNode
	)

export const getApproverNode = (extendNode) =>
	Object.assign(
		{
			id: 'approver',
			priority: 0,
			isDefaultBranchNode: 0,
			isBranchNode: 0,
			isApproverNode: 1,
			isInvalidNode: null,
			isInvalidPath: null,
			title: '审批人',
			titleEditing: 0,
			placeholder: '选择审批人',
			content: '',
			nodeTypeCode: 'approver',
			nodeTypeName: '审批人',
			data: {}
		},
		extendNode
	)

export const getNotifierNode = (extendNode) =>
	Object.assign(
		{
			id: 'notifier',
			priority: 0,
			isDefaultBranchNode: 0,
			isBranchNode: 0,
			isNotifierNode: 1,
			isInvalidNode: null,
			isInvalidPath: null,
			title: '抄送人',
			titleEditing: 0,
			placeholder: '选择抄送人',
			content: '',
			nodeTypeCode: 'notifier',
			nodeTypeName: '抄送人',
			data: {}
		},
		extendNode
	)

export const getEndNode = (extendNode) =>
	Object.assign(
		{
			id: 'end',
			priority: 0,
			isEndNode: 1,
			isInvalidPath: null,
			placeholder: '流程结束',
			nodeTypeCode: 'end',
			nodeTypeName: '结束'
		},
		extendNode
	)
