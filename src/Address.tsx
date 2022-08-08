import React, { useEffect, useContext, useCallback, useMemo } from "react";
import {
  useParams,
  useNavigate,
  Routes,
  Route,
  useSearchParams,
} from "react-router-dom";
import { Tab } from "@headlessui/react";
import Blockies from "react-blockies";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";
import { faQuestionCircle } from "@fortawesome/free-regular-svg-icons/faQuestionCircle";
import StandardFrame from "./StandardFrame";
import StandardSubtitle from "./StandardSubtitle";
import AddressOrENSNameNotFound from "./components/AddressOrENSNameNotFound";
import Copy from "./components/Copy";
import Faucet from "./components/Faucet";
import NavTab from "./components/NavTab";
import SourcifyLogo from "./sourcify/SourcifyLogo";
import AddressTransactionResults from "./address/AddressTransactionResults";
import Contracts from "./address/Contracts";
import AddressApprovals from "./address/AddressApprovals";
import { RuntimeContext } from "./useRuntime";
import { useAppConfigContext } from "./useAppConfig";
import { useAddressOrENS } from "./useResolvedAddresses";
import { useMultipleMetadata } from "./sourcify/useSourcify";
import { ChecksummedAddress } from "./types";
import { useAddressesWithCode } from "./useErigonHooks";
import { useChainInfo } from "./useChainInfo";

const AddressTransactionByNonce = React.lazy(
  () => import("./AddressTransactionByNonce")
);

const Address: React.FC = () => {
  const { provider } = useContext(RuntimeContext);
  const { addressOrName, direction } = useParams();
  if (addressOrName === undefined) {
    throw new Error("addressOrName couldn't be undefined here");
  }

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFixer = useCallback(
    (address: ChecksummedAddress) => {
      navigate(
        `/address/${address}${
          direction ? "/" + direction : ""
        }?${searchParams.toString()}`,
        { replace: true }
      );
    },
    [navigate, direction, searchParams]
  );
  const [checksummedAddress, isENS, error] = useAddressOrENS(
    addressOrName,
    urlFixer
  );

  useEffect(() => {
    if (isENS || checksummedAddress === undefined) {
      document.title = `Address ${addressOrName} | Otterscan`;
    } else {
      document.title = `Address ${checksummedAddress} | Otterscan`;
    }
  }, [addressOrName, checksummedAddress, isENS]);

  const { sourcifySource } = useAppConfigContext();
  const checksummedAddressAsArray = useMemo(
    () => (checksummedAddress !== undefined ? [checksummedAddress] : []),
    [checksummedAddress]
  );
  const contractAddresses = useAddressesWithCode(
    provider,
    checksummedAddressAsArray
  );
  const metadatas = useMultipleMetadata(
    undefined,
    contractAddresses,
    provider?.network.chainId,
    sourcifySource
  );
  const addressMetadata =
    checksummedAddress !== undefined
      ? metadatas[checksummedAddress]
      : undefined;

  const { network, faucets } = useChainInfo();

  // Search address by nonce === transaction @ nonce
  const rawNonce = searchParams.get("nonce");
  if (rawNonce !== null) {
    return (
      <AddressTransactionByNonce
        checksummedAddress={checksummedAddress}
        rawNonce={rawNonce}
      />
    );
  }

  return (
    <StandardFrame>
      {error ? (
        <AddressOrENSNameNotFound
          addressOrENSName={addressOrName}
          supportsENS={provider?.network.ensAddress !== undefined}
        />
      ) : (
        checksummedAddress && (
          <>
            <StandardSubtitle>
              <div className="flex space-x-2 items-baseline">
                <Blockies
                  className="self-center rounded"
                  seed={checksummedAddress.toLowerCase()}
                  scale={3}
                />
                <span>Address</span>
                <span className="font-address text-base text-gray-500">
                  {checksummedAddress}
                </span>
                <Copy value={checksummedAddress} rounded />
                {/* Only display faucets for testnets who actually have any */}
                {network === "testnet" && faucets && faucets.length > 0 && (
                  <Faucet address={checksummedAddress} rounded />
                )}
                {isENS && (
                  <span className="rounded-lg px-2 py-1 bg-gray-200 text-gray-500 text-xs">
                    ENS: {addressOrName}
                  </span>
                )}
              </div>
            </StandardSubtitle>
            <Tab.Group>
              <Tab.List className="flex space-x-2 border-l border-r border-t rounded-t-lg bg-white">
                <NavTab href={`/address/${addressOrName}`}>Overview</NavTab>
                {(contractAddresses?.length ?? 0) > 0 && (
                  <NavTab href={`/address/${addressOrName}/contract`}>
                    <span
                      className={`flex items-baseline space-x-2 ${
                        addressMetadata === undefined ? "italic opacity-50" : ""
                      }`}
                    >
                      <span>Contract</span>
                      {addressMetadata === undefined ? (
                        <span className="self-center">
                          <FontAwesomeIcon
                            className="animate-spin"
                            icon={faCircleNotch}
                          />
                        </span>
                      ) : addressMetadata === null ? (
                        <span className="self-center text-red-500">
                          <FontAwesomeIcon icon={faQuestionCircle} />
                        </span>
                      ) : (
                        <span className="self-center">
                          <SourcifyLogo />
                        </span>
                      )}
                    </span>
                  </NavTab>
                )}
                <NavTab href={`/address/${addressOrName}/approvals`}>
                  Token Approvals
                </NavTab>
              </Tab.List>
              <Tab.Panels>
                <Routes>
                  <Route
                    index
                    element={
                      <AddressTransactionResults address={checksummedAddress} />
                    }
                  />
                  <Route
                    path="txs/:direction"
                    element={
                      <AddressTransactionResults address={checksummedAddress} />
                    }
                  />
                  <Route
                    path="contract"
                    element={
                      <Contracts
                        checksummedAddress={checksummedAddress}
                        rawMetadata={
                          contractAddresses !== undefined &&
                          contractAddresses.length === 0
                            ? null
                            : addressMetadata
                        }
                      />
                    }
                  />
                  <Route
                    path="approvals"
                    element={<AddressApprovals address={checksummedAddress} />}
                  />
                </Routes>
              </Tab.Panels>
            </Tab.Group>
          </>
        )
      )}
    </StandardFrame>
  );
};

export default Address;
