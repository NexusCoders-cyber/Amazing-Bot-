import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animethumbsup',
  endpoint: 'thumbsup',
  verb: 'gave thumbs up to',
  selfAction: false
});
