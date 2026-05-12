import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animehighfive',
  endpoint: 'highfive',
  verb: 'high-fived',
  selfAction: false
});
