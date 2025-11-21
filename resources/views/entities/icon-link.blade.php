<a href="{{ $entity->getUrl() }}" class="flex-container-row items-center">
    <span role="presentation"
          class="icon flex-none text-{{$entity->getType()}}">@include('common.vatger-entity-icon', ['entity_type' => $entity->getType()])</span>
    <div class="flex text-{{ $entity->getType() }}">
        {{ $entity->name }}
    </div>
</a>