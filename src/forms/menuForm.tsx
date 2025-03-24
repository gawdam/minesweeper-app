import { Devvit } from '@devvit/public-api';
import { CreatePreview } from '../views/loading.js';


export const createForm = Devvit.createForm(
  {
    title: 'Create a mine land',
    acceptLabel: 'Create mine land',
    fields: [
      {
        name: 'title',
        label: 'Post Title',
        type: 'string',
        defaultValue: "Mine Land : Edition 1",
        required: true,
        helpText: `What do you want your post title to be?`,
      },
      {
        name: 'gridSize',
        label: `Size of the grid for the mine land`,
        type: 'number',
        required: true,
        defaultValue: 3,
      },
      {
        name: 'angelPoints',
        label: `Points for each safe completion`,
        type: 'number',
        required: true,
        defaultValue: 5,
      },
      {
        name: 'devilPoints',
        label: `Points for each mine detonation`,
        type: 'number',
        required: true,
        defaultValue: 2,
      },
    ],
  },
//   (event, context) => {
//     // Create a custom post with the form values
//     context.reddit.submitPost({
//       subredditName: context.subredditName!,
//       title: `Grid ${event.values.gridSize}x${event.values.gridSize}`,
//       customPostType: 'GridPost',
//       customPostData: {
//         gridSize: event.values.gridSize,
//         angelPoints: event.values.angelPoints,
//         devilPoints: event.values.devilPoints,
//       },
//     });
//     context.ui.showToast('Grid post created!');
//   }
  async (event, { reddit, subredditName, ui, redis, settings }) => {



    const gridSize: number = event.values.gridSize;
    const angelPoints: number = event.values.angelPoints;
    const devilPoints: number = event.values.devilPoints;
    const title: string = event.values.title;

    const post = await reddit.submitPost({
      title: `${title}`,
      subredditName: subredditName!,
      preview: CreatePreview(),
    });

    //store postID and answers in redis
    await redis.set(post.id, title);
    await redis.set(`${post.id}_gridSize`, JSON.stringify(gridSize));
    const minePosition = Math.floor(Math.random() * (gridSize * gridSize));


    // Store it in Redis with a unique key
    await redis.set(`${post.id}_minePosition`, minePosition.toString());


    ui.showToast(`Mine field created!`);
    ui.navigateTo(post);
  }
);
