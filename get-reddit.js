const https = require('https');

const makeHttpCall = async (options) => {
	return new Promise((resolve) => {
		var req = https.request(options, res => {
			res.setEncoding('utf8');
			var returnData = "";
			res.on('data', chunk => {
				returnData = returnData + chunk;
			});
			res.on('end', () => {
				let results = JSON.parse(returnData);
				resolve(results);
			});
		});
		if (options.method == 'POST' || options.method == 'PATCH') {
			req.write(JSON.stringify(options.body));
		}
		req.end();
	})
}

const extractor = (feed) => {

	const norm = (value, min, max) => {
		return ((value - min) / (max - min)) * 100;
	}

	const postScore = (post) => {
		let score = parseInt(post.ups, 10);
		score += parseInt(post.num_comments, 10) * 2;
		return norm(score, 0, post.subreddit_subscribers).toFixed(4);
	}

	const compare = (a, b) => {
		if (a.score > b.score)
			return -1;
		if (a.score < b.score)
			return 1;
		return 0;
	}

	const getMediaFromUrl = (post) => {
		try {
			let domain = post.domain;
			let url = post.url || '';

			switch (domain) {
				case 'gfycat.com':
					url = url.replace(/\gfycat.com/gi, 'giant.gfycat.com');
					url += '.mp4';
					break;

				case 'i.imgur.com':
					url = url.replace(/\.gifv/gi, '.mp4');
					break;

				case 'v.redd.it':
					url = url + '.mp4';
					break;

				default:
					break;
			}

			if (post.subreddit === 'Cinemagraphs') {
				url = url.replace(/\.mp4/gi, '.gif');
			}

			return url;

		} catch (error) {
			return error;
		}
	}

	try {
		let data = feed.data.children;

		let posts = [];

		for (let key in data) {
			let child = data[key].data;

			let post = {
				id: child.id,
				title: child.title,
				selftext: child.selftext,
				// link_flair_type: child.link_flair_type,
				subreddit: child.subreddit,
				domain: child.domain,
				upvotes: child.ups,
				author: child.author.replace(/(\_)/gim, ' '),
				comments: child.num_comments,
				permalink: child.permalink,
				type: child.post_hint,
				url: getMediaFromUrl(child)
			};

			if (child.domain == 'v.redd.it' && child.crosspost_parent_list && child.crosspost_parent_list[0].secure_media) {
				post.url = child.crosspost_parent_list[0].secure_media.reddit_video.scrubber_media_url || '';
				post.type = 'video';
			}

			posts.push(post);
		}

		// posts.sort(compare);
		// console.log('posts: ' + JSON.stringify(posts));
		return posts;

	} catch (error) {
		return {
			error: error
		};
	}
}

const getPosts = async (data) => {
	// https://www.reddit.com/r/specializedtools/top/?t=week
	let options = {
		host: 'www.reddit.com',
		port: 443,
		path: `/r/${data.subreddit}/${data.posttype}.json?t=${data.timeperiod}`,
		method: 'GET'
	};
	let posts = await makeHttpCall(options);
	let formatted = extractor(posts);
	return formatted;
}

//add to package.json
module.exports = function (RED) {
	function GetRedditNode(config) {
		RED.nodes.createNode(this, config);
		let node = this;

		let data = {
			subreddit: config.subreddit,
			posttype: config.posttype,
			timeperiod: config.timeperiod
		}

		node.on('input', function (msg) {
			let results = getPosts(data);
			node.status({ fill: 'green', shape: 'ring', text: 'requesting - ' + data.subreddit });
			results.then((value) => {
				if (value.error) {
					node.status({ fill: 'red', shape: 'ring', text: 'error - ' + data.subreddit  });
					node.error(value.error);
				} else {
					try {
						msg.payload = value;
						node.status({ fill: 'green', shape: 'dot', text: `${data.subreddit} -  ${data.posttype} - ${data.timeperiod}`  });
						node.send(msg);
					} catch (error) {
						node.status({ fill: 'red', shape: 'dot', text: 'error - ' + data.subreddit  });
						node.error(error);
					}
				}
			});
		});
	}
	RED.nodes.registerType('get-reddit', GetRedditNode);
}