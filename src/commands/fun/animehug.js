import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animehug',
  endpoint: 'hug',
  verb: 'hugged',
  selfAction: false
});
