import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animewink',
  endpoint: 'wink',
  verb: 'winked',
  selfAction: true
});
