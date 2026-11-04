// The ways a request reaches the bundle. A function url request, the
// router's CloudFront origin, is the native shape every handler gets; the
// other sources are turned into it, & their answers back.
export { fromAlbEvent, isAlbEvent, toAlbResult } from './alb.js'
