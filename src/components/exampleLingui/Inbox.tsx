import React from 'react'
import {Plural, Trans} from '@lingui/macro'
import {useLingui} from "@lingui/react";
export default function Inbox() {
    const messages = [{}, {}]
    const messagesCount = messages.length
    const lastLogin = new Date()
    const markAsRead = () => { alert('Marked as read.') }
    const { i18n } = useLingui()
    return (
        <div>
            <h1><Trans>Message Inbox</Trans></h1>

            <p><Trans>
                See all <a href="/unread">unread messages</a>{" or "}
                <a onClick={markAsRead}>mark them</a> as read.
            </Trans>
            </p>

            <p>
                {/*{*/}
                {/*    messagesCount === 1*/}
                {/*        ? `There's ${messagesCount} message in your inbox.`*/}
                {/*        : `There are ${messagesCount} messages in your inbox.`*/}
                {/*}*/}
                <Plural
                    value={messagesCount}
                    one="There's # message in your inbox"
                    other="There are # messages in your inbox"

                />
            </p>
            <footer>
                <Trans>
                    Last login on {i18n.date(lastLogin)}.
                </Trans>
            </footer>
            {/*<footer>*/}
            {/*    Last login on {lastLogin.toLocaleDateString()}.*/}
            {/*</footer>*/}
        </div>
    )
}