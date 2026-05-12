import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animekiss',
  endpoint: 'kiss',
  verb: 'kissed',
  selfAction: false
});
