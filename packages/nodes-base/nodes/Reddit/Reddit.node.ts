import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	redditApiRequest,
	redditApiRequestAllItems,
} from './GenericFunctions';

import {
	myAccountOperations,
} from './MyAccountDescription';

import {
	submissionFields,
	submissionOperations,
} from './SubmissionDescription';

export class Reddit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Reddit',
		name: 'reddit',
		icon: 'file:reddit.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Reddit API',
		defaults: {
			name: 'Reddit',
			color: '#ff5700',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'redditOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'My Account',
						value: 'myAccount',
					},
					{
						name: 'Submission',
						value: 'submission',
					},
				],
				default: 'myAccount',
				description: 'Resource to consume',
			},

			// myAccount
			...myAccountOperations,

			// submission
			...submissionFields,
			...submissionOperations,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			if (resource === 'myAccount') {

				if (operation === 'getIdentity') {

					responseData = await redditApiRequest.call(this, 'GET', 'me');
					responseData = responseData.features;

				} else {

					const endpoints: {[key: string]: string} = {
						getBlockedUsers: 'blocked',
						getFriends: 'friends',
						getKarma: 'karma',
						getPrefs: 'prefs',
						getTrophies: 'trophies',
					};

					responseData = await redditApiRequest.call(this, 'GET', `me/${endpoints[operation]}`);

				}

			} else if (resource === 'post') {

				if (operation === 'submit') {

					const body: IDataObject = {
						title: this.getNodeParameter('title', i),
						sr: this.getNodeParameter('subreddit', i),
						kind: this.getNodeParameter('kind', i),
					};

					body.kind === 'self'
						? body.text = this.getNodeParameter('text', i)
						: body.url = this.getNodeParameter('url', i);

					const resubmit = this.getNodeParameter('resubmit', i);

					if (resubmit) {
						body.resubmit = true;
					}

					responseData = await redditApiRequest.call(this, 'POST', 'submit', body);

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}