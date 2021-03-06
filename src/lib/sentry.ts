import * as SentryElectron from '@sentry/electron';
import {SentryEvent} from '@sentry/electron';
import {init} from '@sentry/electron/dist/main';
import {SentryEventHint} from '@sentry/types';

import * as pkgInfo from '../../package.json';


export const Sentry = SentryElectron;

export function initBugTracker (sentryOptions: SentryOptions) {

    const useSentry = sentryOptions && sentryOptions.dsn;

    if (useSentry) {
        init({
            ...sentryOptions,
            beforeSend (event: SentryEvent, hint?: SentryEventHint): SentryEvent {

                event.release = pkgInfo.version;
                if (event.contexts.app) {
                    event.contexts.app['build_type'] = environment.development ? 'dev' : 'prod';
                }
                // to extend error context
                if (hint && hint.originalException) {
                    if (hint.originalException['extraInfo']) {
                        event.extra = {...(event.extra || {}), ...hint.originalException['extraInfo']};
                    }
                }
                return event;
            }
        });
    } else {
        process.on('uncaughtException', function (err: any) {
            console.error('Caught exception: ', err);
        });
        process.on('unhandledRejection', (reason, p) => {
            console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
            // application specific logging, throwing an error, or other logic here
        });
    }
}
