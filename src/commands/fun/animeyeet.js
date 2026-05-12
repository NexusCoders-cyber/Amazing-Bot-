import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animeyeet',
  endpoint: 'yeet',
  verb: 'yeeted',
  selfAction: false
});
