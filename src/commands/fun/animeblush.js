import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animeblush',
  endpoint: 'blush',
  verb: 'blushed',
  selfAction: true
});
