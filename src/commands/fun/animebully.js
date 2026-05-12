import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animebully',
  endpoint: 'bully',
  verb: 'bullied',
  selfAction: false
});
