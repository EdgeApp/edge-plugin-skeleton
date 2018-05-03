import PropTypes from 'prop-types'
import React from 'react'
import { withStyles } from 'material-ui/styles'
import Card, { CardContent } from 'material-ui/Card'
import TextField from 'material-ui/TextField'
import { InputAdornment } from 'material-ui/Input'
import Typography from 'material-ui/Typography'
import { CircularProgress } from 'material-ui/Progress'
import uuidv1 from 'uuid/v1'

import { core, ui } from 'edge-libplugin'
import { requestAbort, requestConfirm, requestQuote, SimplexForm } from './api'
import {
  DailyLimit,
  EdgeButton,
  ConfirmDialog,
  Support,
  PoweredBy,
  WalletDrawer
} from './components'

import './inline.css'

/* There is not a way to change the fiat currency currently */
const FIAT_CURRENCY = 'USD'

const formatRate = (rate, symbol) => {
  return symbol + rate.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const buildObject = (res) => {
  const quote = {
    version: '1',
    partner: 'edge',
    payment_flow_type: 'wallet',
    return_url: 'https://www.edgesecure.co',
    quote_id: res.quote_id,
    wallet_id: res.wallet_id,
    payment_id: res.quote_id,
    order_id: res.quote_id,
    user_id: res.user_id,
    address: '1BnT87d7jeqmT7kr49kLMUsNzCeKQq2mBT',
    currency: 'BTC',
    fiat_total_amount_amount: res.fiat_money.total_amount,
    fiat_total_amount_currency: res.fiat_money.currency,
    fee: res.fiat_money.total_amount - res.fiat_money.base_amount,
    fiat_amount: res.fiat_money.base_amount,
    digital_amount: res.digital_money.amount,
    digital_currency: res.digital_money.currency
  }
  const rate = {
    currency: res.digital_money.currency,
    rate: (quote.fiat_amount / quote.digital_amount)
  }
  return {quote, rate}
}

const buyStyles = theme => ({
  card: {
    margin: '20px 0px',
    padding: '0px 10px'
  },
  h3: {
    color: theme.palette.primary.main,
    padding: 0,
    margin: '10px 0',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  conversion: {
    fontSize: '24pt',
    color: theme.palette.primary.main
  },
  p: {
    color: '#999',
    paddingBottom: '10px',
    textAlign: 'center'
  }
})

class BuyScene extends React.Component {
  constructor (props) {
    super(props)
    /* sessionId can be regenerated each time we come to this form */
    this.sessionId = uuidv1()
    /* this should be written to the encrypted storage */
    this.userId = window.localStorage.getItem('simplex_user_id') || uuidv1()
    /* this only needs to persist with an install. localStorage will do */
    this.uaid = window.localStorage.getItem('simplex_install_id') || uuidv1()
    window.localStorage.setItem('simplex_install_id', this.uaid)

    this.state = {
      dialogOpen: false,
      drawerOpen: false,
      wallets: [],
      selectedWallet: {
        currency: 'BTC'
      },
      rate: null,
      quote: null
    }
  }
  componentWillMount () {
    ui.title('Buy Bitcoin')
    this.loadWallets()
    this.loadConversion()
  }
  loadWallets = () => {
    core.wallets()
      .then((data) => {
        this.setState({
          wallets: data
        })
      })
      .catch(() => {
        ui.showAlert(false, 'Error', 'Unable to fetch wallets. Please try again later.')
        core.exit()
      })
  }
  loadConversion = () => {
    const c = this.state.selectedWallet.currency
    requestQuote(this.userId, c, 1, c, FIAT_CURRENCY)
      .then(data => data.json())
      .then(r => {
        const {rate} = buildObject(r.res)
        this.setState({rate})
      })
  }
  next = () => {
    this.setState({
      dialogOpen: true
    })
  }
  cancel = () => {
    this.props.history.goBack()
    ui.navStackPop()
  }
  handleAccept = () => {
    this.setState({
      dialogOpen: false
    })
    requestConfirm(
      this.userId, this.sessionId,
      this.uaid, this.state.quote)
      .then((data) => data.json())
      .then((data) => {
        // document.getElementById('payment_form').submit()
        console.log(data)
      })
      .catch((err) => {
        /* Tell the user dummy */
        console.log(err)
      })
  }
  handleClose = () => {
    this.setState({
      dialogOpen: false
    })
  }
  openWallets = () => {
    this.setState({
      drawerOpen: true
    })
  }
  closeWallets = () => {
    this.setState({
      drawerOpen: false
    })
  }
  selectWallet = (event) => {
    console.log(event)
    this.closeWallets()
  }

  calcFiat = (event) => {
    if (event.target.value) {
      this.setState({
        cryptoLoading: false,
        fiatLoading: true
      })
      const v = event.target.value
      const c = this.state.selectedWallet.currency
      requestQuote(this.userId, c, v, c, FIAT_CURRENCY)
        .then(data => data.json())
        .then(r => {
          const {quote, rate} = buildObject(r.res)
          this.setState({
            fiatLoading: false,
            quote,
            rate
          })
          document.getElementById('fiatInput').value = r.res.fiat_money.base_amount
        })
        .catch(err => {
          console.log(err)
          /* core.debugLevel(0, JSON.stringify(err)) */
        })
    } else {
      requestAbort()
      this.setState({
        quote: null,
        fiatLoading: false,
        cryptoLoading: false
      })
    }
  }

  calcCrypto = async (event) => {
    console.log(event)
    if (event.target.value) {
      this.setState({
        fiatLoading: false,
        cryptoLoading: true
      })
      const v = event.target.value
      const c = this.state.selectedWallet.currency
      requestQuote(this.userId, FIAT_CURRENCY, v, c, FIAT_CURRENCY)
        .then(data => data.json())
        .then(r => {
          const {quote, rate} = buildObject(r.res)
          this.setState({
            cryptoLoading: false,
            quote,
            rate
          })
          document.getElementById('cryptoInput').value = r.res.digital_money.amount
        })
        .catch(err => {
          console.log(err)
          /* core.debugLevel(0, JSON.stringify(err)) */
        })
    } else {
      requestAbort()
      this.setState({
        quote: null,
        fiatLoading: false,
        cryptoLoading: false
      })
    }
  }

  render () {
    const { classes } = this.props
    return (
      <div>
        {this.state.quote && (
          <ConfirmDialog
            fiatAmount={formatRate(this.state.quote.fiat_amount, '$')}
            fee={formatRate(this.state.quote.fee, '$')}
            open={this.state.dialogOpen}
            onAccept={this.handleAccept}
            onClose={this.handleClose} />
        )}
        <Card className={classes.card}>
          <CardContent>
            <Typography
              component="h3"
              className={classes.h3}>
              Conversion Rate
            </Typography>
            {!this.state.rate && (
              <CircularProgress size={25} />
            )}
            {this.state.rate && (
              <Typography component="p" className={classes.conversion}>
                1{this.state.rate.currency} = {formatRate(this.state.rate.rate, '$')}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card className={classes.card}>
          <CardContent>
            <Typography
              variant="headline"
              component="h3"
              className={classes.h3}>
              Destination Wallet
            </Typography>
            <EdgeButton color="primary" onClick={this.openWallets}>
              Choose Destination Wallet
            </EdgeButton>
          </CardContent>
        </Card>

        <Card className={classes.card}>
          <CardContent>
            <Typography
              variant="headline"
              component="h3"
              className={classes.h3}>
              Purchase Amount
            </Typography>

            <TextField id="cryptoInput" type="number" label="Enter Amount"
              margin="none"
              fullWidth
              disabled={this.state.cryptoLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {this.state.cryptoLoading && <CircularProgress size={25} />}
                    {!this.state.cryptoLoading && this.state.selectedWallet.currency}
                  </InputAdornment>)
              }}
              onKeyUp={this.calcFiat}
            />

            <TextField id="fiatInput" type="number" label="Enter Amount"
              margin="none" fullWidth
              disabled={this.state.fiatLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {this.state.fiatLoading && <CircularProgress size={25} />}
                    {!this.state.fiatLoading && FIAT_CURRENCY}
                  </InputAdornment>)
              }}
              onKeyUp={this.calcCrypto}
            />

            <DailyLimit dailyLimit="$20,000" monthlyLimit="$50,000" />
          </CardContent>
        </Card>

        <Card className={classes.card}>
          <CardContent>
            <Typography component="p" className={classes.p}>
              You will see a confirmation screen before you buy.
            </Typography>
            <EdgeButton
              color="primary"
              onClick={this.next}
              disabled={this.state.quote === null}>
              Next
            </EdgeButton>
            <EdgeButton onClick={this.cancel}>Cancel</EdgeButton>
          </CardContent>
        </Card>

        {this.state.quote &&
          <SimplexForm quote={this.state.quote} />}

        <Support />
        <PoweredBy />
        <WalletDrawer
          open={this.state.drawerOpen}
          selectWallet={this.selectWallet}
          onHeaderClick={this.closeWallets}
          onClose={this.closeWallets}
          wallets={this.state.wallets} />
      </div>
    )
  }
}

BuyScene.propTypes = {
  classes: PropTypes.object,
  history: PropTypes.object
}

export default withStyles(buyStyles)(BuyScene)