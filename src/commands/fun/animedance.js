import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animedance',
  endpoint: 'dance',
  verb: 'danced',
  selfAction: true
});
