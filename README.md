# node-red-contrib-get-reddit
## Fetch posts from specific subreddits.

An easy way to get the top/hot posts from the subreddit you specify.

If you choose `top` as post type, then you can specify a time period of `day`, `week`, `month`, `year` and `all`. Default is `day`.

Outputs an array of posts. Each post object has the following fields:

````{
		id: Unique Post ID,
		title: Post Title,
		selftext: Post Selftext,
		subreddit: Subreddit,
		domain: Post Domain,
		upvotes: Post Upvotes,
		author: Post Author,
		comments: Number of Comments,
		permalink: Post Link,
		type: Post Type,
		url: Post URL,
		score: Post Score
	}
