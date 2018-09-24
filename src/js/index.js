import { core, config, ui } from 'edge-libplugin'
import $ from 'jquery'

let wallets = []

config.get('API_TOKEN')
  .then(data => {
    $('#apiToken').html(data)
    return true
  })
  .catch((reason) => {
    $('#apiToken').html(reason)
  })

core.selectedWallet()
  .then((data) => {
    $('#currentWallet').html(JSON.stringify(data))
    return true
  })
  .catch((reason) => {
    $('#currentWallet').html(JSON.stringify(reason))
  })

core.readData('app-data')
  .then((data) => {
    $('#data').val(data)
    return true
  })
  .catch((reason) => {
    core.debugLevel(1, JSON.stringify(reason))
  })

$('#writeData').click(function () {
  core.writeData('app-data', $('#data').val()).then((data) => {
    core.debugLevel(1, 'Data written')
    return true
  })
})

$('#clearData').click(function () {
  core.clearData().then((data) => {
    core.debugLevel(1, 'Data cleared')
    $('#data').val('')
    return true
  })
})

const updateWallets = function () {
  core.wallets().then((data) => {
    if (data.length > 0) {
      wallets = data
      data.forEach(item => {
        $('#walletSelection').append('<option value="' + item.id + '">' + item.name + ' - ' + item.currencyCode + '</option>')
      })
    }
    $('#walletsData').val(JSON.stringify(data))
    $('#walletSelection').change(() => {
      const id = $('#walletSelection option:selected').val()
      const wallet = wallets.find((wallet) => wallet.id === id)
      if (wallet) {
        core.getAddress(wallet.id, wallet.currencyCode).then(data => {
          return $('#addressData').val(JSON.stringify(data))
        }).catch(reason => {
          $('#addressData').val(reason)
        })
      }
    })
    return true
  })
    .catch((reason) => {
      $('#walletsData').val(JSON.stringify(reason))
    })
}
// Fetch all wallets selected wallet
$('#wallets').click(function () {
  $('#walletsData').html('fetching wallets...')
  updateWallets()
})
updateWallets()

$('#changeWallet').click(function () {
  core.chooseWallet().then((data) => {
    return true
  })
})

$('#send').click(function () {
  const $address = $('#sendAddress')
  const $amount = $('#sendAmount')
  if ($address.val() === '') {
    window.alert('Please provide a destination address')
  } else {
    core.requestSpend(null, $address.val(), $amount.val(), {})
      .then(function () {
        window.alert('spend returned')
        return true
      })
  }
})

$('#debugLevel').click(function () {
  core.debugLevel(1, 'Debug statement')
})

$('#title').keyup(function () {
  ui.title($(this).val())
})
$('#title').keyup()

$('#showAlert').click(function () {
  ui.showAlert(true, 'Test Alert', 'This is the message')
  setTimeout(function () {
    ui.hideAlert()
  }, 2000)
})

$('#openAirbitz').click(function () {
  ui.launchExternal('https://airbitz.co')
})

window.onpopstate = function (event) {
  console.log(JSON.stringify(event))
  console.log(JSON.stringify(event.state))
}
let navCount = 0
$('#navPush').click(function () {
  ui.navStackPush(navCount.toString())
  navCount += 1
  window.history.pushState({navCount}, navCount.toString(), navCount + '.html')
})

$('#navPop').click(function () {
  ui.navStackPop()
    .then(data => {
      navCount = parseInt(data)
      return true
    })
})

$('#navClear').click(function () {
  ui.navStackClear()
  navCount = 0
})

$('#back').click(function () {
  ui.back()
})

$('#exit').click(function () {
  ui.exit()
})
