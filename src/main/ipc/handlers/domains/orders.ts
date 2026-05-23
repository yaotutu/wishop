import { registerOrderHandlers } from '../orders';
import { registerOrderAssociationHandlers } from '../orderAssociations';
import { registerProductSourceHandlers } from '../productSources';
import { registerRealAddressHandlers } from '../realAddresses';

type OrdersContext = Parameters<typeof registerOrderHandlers>[0];

export function registerOrdersDomainHandlers(context: OrdersContext): void {
  registerOrderHandlers(context);
  registerOrderAssociationHandlers();
  registerProductSourceHandlers();
  registerRealAddressHandlers();
}
