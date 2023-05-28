// function to identify products near the user

export function geoDistance(lat1: number,lon1: number,lat2: number,lon2: number) {

    // a = sin²(Delta/2) + cos(Fi1)⋅cos(Fi2)⋅sin²(DeltaLambda/2)
    // tanδ = √(a) / √(1−a)
    // see mathforum.org/library/drmath/view/51879.html for derivation

    const R = 6371e3, Pi = Math.PI;
    const { sin, cos, atan2 } = Math;
    const Fi1 = lat1 * Pi / 180, Lambda1 = lon1 * Pi / 180;
    const Fi2 = lat2 * Pi / 180, Lambda2 = lon2 * Pi / 180;
    const Delta = Fi2 - Fi1,        DeltaLambda = Lambda2 - Lambda1;

    const a = sin(Delta/2)**2 + cos(Fi1) * cos(Fi2) * sin(DeltaLambda/2)**2;
    const c = 2 * atan2(a**.5, (1-a)**.5);
    return R * c;
}
//
// console.log('Расстояние в метрах =',
//     geoDistance(55.6310511, 37.651611, 55.6320565,37.659674));