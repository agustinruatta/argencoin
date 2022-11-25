![CI workflow status](https://github.com/agustinruatta/argencoin/actions/workflows/CI.yml/badge.svg?branch=main)

# Argencoin

## Abstract
Blockchain token that is pegged to Argentinian currency.

## Introducción
Argentina se ha caracterizado por una alta inflación y devaluación en los últimos 20 años. Por esa razón, su población ha adoptado la costumbre de resguardar sus ahorros en la compra del dólar estadounidense. Sin embargo, esa compra genera que el capital usado no pueda ser usado. Es decir, si una persona compra 200 dólares y lo almacena en una caja fuerte o una caja de ahorros, no puede ser usado para ninguna otra utilidad.
Es aquí donde surge Argencoin (desde ahora ARGC), una criptomoneda que usa el poder de la Blockchain y es emitida a través del respaldo de stablecoins atadas al dólar (como DAI, USDC, USDT, etc), y que permite el su uso.
El funcionamiento está basado en el token DAI, el cual se puede emitir dejando de colateral un token/criptomoneda.
Funcionamiento

## Explicación no técnica

### Minting
Una persona deposita en un smart contract una stablecoin atada al dólar (DAI, USDC, USDT, etc). El mismo es usado como colateral y permite emitir (*mint*) ARGC sobre un porcentaje de lo que representa el valor depositado (*collateral percentage*).

Supongamos que una persona (*Issuer*) deposita 10 USDC, y 1 USDC está 300 pesos argentinos (ARS). Por ende, tiene un respaldo de 3000 ARS. Si el collateral percentage es de 150%, entonces podrá emitir (mint) 2000 ARGC como máximo.

El colateral usado (en este ejemplo los 10 USDC) quedan bloqueados hasta que el issuer realice el burning.

El proceso de minting tiene un fee, y es sobre la stablecoin. Si el mismo es del 1%, y son depositados 10 USDC, entonces 0.10 USDC es el fee, y 9.90 USDC son usados como colateral.

Siguiendo con el ejemplo anterior, un issuer deposita 10 USDC y decide emitir el máximo posible de ARGC. Esto generaría que:
- 0.1 USDC son fees.
- 9.90 son usados como colateral. Como 1 USDC está a 300 ARS, entonces el colateral equivale a 9.90 * 300 = 2970 ARS.
- Debido a que el collateral percentage es de 150%, entonces emitirá un máximo de 1980 ARGC (9.90 USDC * 300 ARGCUSDC* 100%150%).

### Burning
En cualquier momento el issuer de las monedas puede devolver los ARGC emitidos para recuperar su colateral.

Continuando con el ejemplo, si el issuer vuelve a depositar en el contrato los 1980 ARGC que había emitido, le será devuelto automáticamente a su dirección los 9.90 USDC de respaldo. De esta forma se “quema” los ARGC emitidos, evitando así la devaluación del mismo.

Este burning puede ser realizado sin importar el precio del USDC. De esta forma se puede lograr una emisión secundaria de dinero, sin perder la fuente real de valor y reserva monetaria.

Por ejemplo, una persona tiene 50.000 USDC y quiere comprar un auto que vale 10.000.000 ARS, pero no quiere vender esos USDC ya que son su fuente de reserva. En ese caso, podría depositar los 50.000 USDC, emitir 10.000.000 de ARGC (valor de dólar a 300 ARS, colateral de 150%, no consideramos los fees) y usarlo para comprar el vehículo. Espera a que pase un año, y debido a la inflación y devaluación el dólar cotiza a 600 ARS. Por ende los 10.000.000 ARGC son mucho más fáciles de recuperar (debido a la devaluación del peso argentino). Vuelve a depositar los 10.000.000 ARGC, y se le devuelve los 50.000 USDC (que pueden ser reusados nuevamente para emitir 20.000.000 de ARGC, o para cualquier otra cosa).

Aquí pudimos ver el potencial de la moneda: permitir a las personas usar sus ahorros en dólares, pero sin perder los mismos, el cual es ayudado debido a la licuación de esa deuda por la devaluación del precio y la gran inflación.

### Liquidation
Puede darse el caso en el que el dólar baje de precio y por ende el colateral no llegue a cubrir los ARGC emitidos, generando una sub-colateralización. Para evitar este problema, los contratos permiten que cualquier persona liquide un contrato en el cual su colateral descienda del liquidation percentage.

Supongamos que una persona depositó 10 USDC, el valor del dólar está a 300 ARS, el collateral percentage es de 150% y el liquidation percentage es de 125%. No consideremos los fees. Esto generaría que pueda emitir 2000 ARGC. Si el precio del dólar no baja de los 250 ARS (2000 ARGC * (125% / 100%) * (1 / 10 USDC) = 250 ARS / USDC ), esa posición no puede ser liquidada por nadie (excepto por el dueño, que puede hacer un burning). Si supera ese límite de liquidación, cualquier usuario puede liquidar la posición con la misma cantidad de ARGC emitido, logrando así obtener las stablecoin a menor precio.

Siguiendo el ejemplo (y despreciando los fees), una persona depositó 10 USDC (que equivalen a 3.000 ARS), emitió 2.000 ARGC, y su límite de liquidación es 250 ARS. Supongamos ahora que el dólar baja a 240. Eso generaría que cualquier persona pueda liquidar esa posición haciendo un “burning” de 2.000 ARGC, que a cambio le daría 10 USDC, que en realidad valen 2.400 ARS (lo cual es un negocio, e incentiva a que los usuarios lo realicen.

### Fees
Como se explicó anteriormente, en cada proceso de minting se toma un porcentaje de la stablecoin como fee, y se lo reparte en varios vaults, que incluye el stacking pool (profundizaremos luego), el protocol pool (que se usará para diversas acciones que lo potencien) y el devs team pool (que es una forma de pago a los mismos, para así seguir mejorando el protocolo).

### Staking
Al hacer staking, los usuarios reciben ARGV. El mismo permite dos utilidades:
- Poder reclamar parte de las ganancias que generó el protocolo sobre su fee y que se encuentra en el stacking pool. Por ejemplo, el usuario A hizo stacking de 100 ARGC, el B de 200 ARGC (ambos en el mismo tiempo), y el fee obtenido fue de 15 USDC. El usuario A puede reclamar el fee que le corresponde, y recibiría 5 USDC. Si lo hiciese el B, recibiría 10 USDC.
- Tiene poder de votación para cambios sobre el protocolo, o para decidir qué hacer con el fee obtenido que se desvía al vault del protocolo.

## Explicación técnica

### Definiciones
ARS = moneda de curso legal de la República Argentina.
USD = moneda de curso legal de los Estados Unidos de América.
COLLATERAL_PERCENTAGE = porcentaje de colateral requerido.
LIQUIDATION_PERCENTAGE = porcentaje límite en el cual, debajo del mismo, la posición puede ser liquidada.
STABLECOIN_PRICE = precio de la stablecoin (como USDC) expresados en ARS.
STABLECOIN_AMOUNT = cantidad de stablecoin que se dejó como garantía.
MINTED_AMOUNT = Cantidad de ARGC que pueden ser emitidos.
LIQUIDATION_VALUE = precio del USD, expresado en ARS, en la cual la posición puede ser liquidada.
FEE_AMOUNT = cantidad de stablecoins que se descuenta como fee.
FEE_PERCENTAGE = porcentaje de fee sobre el proceso de minting.

### Ecuaciones
MINTED_AMOUNT = (STABLECOIN_AMOUNT - FEE_AMOUNT) * STABLECOIN_PRICE * (100% / COLLATERAL_PERCENTAGE)
FEE_AMOUNT = STABLECOIN_AMOUNT * (FEE_PERCENTAGE / 100%)
LIQUIDATION_VALUE = STABLECOIN_PRICE * (COLLATERAL_PERCENTAGE / 100%) * LIQUIDATION_PERCENTAGE

### Ejemplo ecuaciones
MINTED_AMOUNT= (10 USDC - 0.1 USDC) * (300 ARGC/USDC) * (100% / 150%) = 1980 ARGC
FEE_AMOUNT = 10 USDC * (1% / 100%)=0.1 USDC
LIQUIDATION_VALUE= (300 ARGC / USDC) * (100% / 150%)* 125% = 250 ARGC/USDC

# Documentación desarrollo

## Tests
In order to run tests, execute
```shell
npx hardhat test
REPORT_GAS=true npx hardhat test
```

## Deploy on localhost

```shell
npx hardhat node & npx hardhat run --network localhost scripts/deploy.ts
```

## Ubiquitous language
- user: address that interact to Argencoin protocol, who can mint ARGC, burn them, etc.