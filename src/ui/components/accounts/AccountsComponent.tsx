import {AdMobAccount} from 'core/appdeal-api/interfaces/admob-account.interface';
import {AppodealAccount} from 'core/appdeal-api/interfaces/appodeal.account.interface';
import {UserAccount} from 'interfaces/common.interfaces';
import {action, ActionTypes} from 'lib/actions';
import {sendToMain} from 'lib/common';
import {classNames} from 'lib/dom';
import {LogFileInfo} from 'lib/sync-logs/logger';
import React, {FormEvent} from 'react';
import {LogListComponent} from '../log-list/LogListComponent';
import style from './Accounts.scss';


export interface AccountsComponentProps {
    appodealAccount: AppodealAccount
    adMobAccounts: Array<AdMobAccount>

}

interface AccountsComponentState {
    selectedAccount: UserAccount;
    accountLogs: LogFileInfo[];
}

export class AccountsComponent extends React.Component<AccountsComponentProps, AccountsComponentState> {

    constructor (props) {
        super(props);
        this.state = {
            selectedAccount: this.props.appodealAccount,
            accountLogs: []
        };
    }

    private selectAccount (account: UserAccount) {
        this.setState({
            selectedAccount: account
        });
        sendToMain('accounts', action(ActionTypes.selectAdmobAccount, account))
            .then((logs: LogFileInfo[]) => this.setState({accountLogs: logs}));
    }

    private updateSelectedAccount (account: UserAccount) {
        let adMobAccount = this.props.adMobAccounts.find(acc => acc.id === account.id);
        if (adMobAccount) {
            this.selectAccount(adMobAccount);
        } else if (account.email === this.props.appodealAccount.email) {
            this.selectAccount(this.props.appodealAccount);
        }
    }

    onSignIn (event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        let formElements = (event.target as HTMLFormElement).elements,
            email = (formElements.namedItem('login') as HTMLInputElement).value,
            password = (formElements.namedItem('password') as HTMLInputElement).value;
        sendToMain('accounts', action(ActionTypes.appodealSignIn, {email, password}))
            .then(account => this.updateSelectedAccount(account as UserAccount))
            .catch(err => {
                alert(err.message);
            });
    }

    onSignOut () {
        sendToMain('accounts', action(ActionTypes.appodealSignOut))
            .then(account => this.updateSelectedAccount(account as UserAccount));
    }

    onAddAccount () {
        sendToMain('accounts', action(ActionTypes.adMobAddAccount))
            .then(account => this.updateSelectedAccount(account as UserAccount));
    }

    runSync () {
        sendToMain('sync', action(ActionTypes.runSync, this.state.selectedAccount));
    }

    openAdmob () {
        sendToMain('accounts', action(ActionTypes.openAdmobPage, this.state.selectedAccount));
    }

    onRemoveAccount () {

    }

    renderAccountForm () {
        let appodealAccount = this.props.appodealAccount;
        if (this.state.selectedAccount === appodealAccount) {
            let hasAccount = !!appodealAccount.email;
            return <form onSubmit={event => this.onSignIn(event)}>
                <label htmlFor="status">Status:</label>
                <output id="status"
                        className={classNames(style.status, {[style.connected]: hasAccount, [style.disconnected]: !hasAccount})}
                >{hasAccount ? 'Connected' : 'Disconnected'}</output>
                <label htmlFor="login">Email:</label>
                {
                    hasAccount ?
                        <output id="login">{appodealAccount.email}</output> :
                        <input type="email" id="login" name="login"/>
                }
                {!hasAccount && <label htmlFor="password">Password:</label>}
                {!hasAccount && <input type="password" id="password" name="password"/>}
                <div className="actions">
                    {
                        hasAccount ?
                            <button type="button" onClick={() => this.onSignOut()}>Sign Out</button> :
                            <button type="submit">Sign In</button>
                    }
                </div>
            </form>;
        } else {
            return <>
                <button type="button" onClick={() => this.runSync()}>Run Sync</button>
                <button type="button" onClick={() => this.openAdmob()}>Open Admob</button>
                <LogListComponent logs={this.state.accountLogs || []} admobAccount={this.state.selectedAccount}></LogListComponent>
            </>;
        }
    }

    render () {
        return (
            <div className={style.accounts}>
                <div className={style.description}>Manage your accounts and bla bla bla...</div>
                <ul className={style.accountsList}>
                    <li onClick={() => this.selectAccount(this.props.appodealAccount)}
                        className={classNames({[style.selected]: this.state.selectedAccount === this.props.appodealAccount})}
                    >
                        <img src="" alt=""/>
                        <span className={style.accountName}>Appodeal</span>
                        <span className={style.accountEmail}>{this.props.appodealAccount.email}</span>
                    </li>
                    {!!this.props.adMobAccounts.length && <li className={style.hr}></li>}
                    {this.props.adMobAccounts.map(acc => {
                        return <li key={acc.email}
                                   onClick={() => this.selectAccount(acc)}
                                   className={classNames({[style.selected]: this.state.selectedAccount === acc})}
                        >
                            <img src="" alt=""/>
                            <span className={style.accountName}>Admob</span>
                            <span className={style.accountEmail}>{acc.email}</span>
                        </li>;
                    })}

                </ul>
                <div className={style.accountControls}>
                    <button type="button" className={style.add} onClick={() => this.onAddAccount()}></button>
                    <button type="button"
                            disabled={this.state.selectedAccount === this.props.appodealAccount}
                            onClick={() => this.onRemoveAccount()}
                    ></button>
                </div>
                <div className={style.accountDetails}>
                    {this.renderAccountForm()}
                </div>
            </div>
        );
    }
}