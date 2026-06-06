package com.MTA.V01.services.controllers;

import com.MTA.V01.models.AilmentType;
import com.MTA.V01.payload.requests.AddAilmentTypeRequest;
import com.MTA.V01.services.general.AilmentTypeServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AilmentTypeServiceWrapper {
    @Autowired
    AilmentTypeServices ailmentTypeServices;


    public ResponseEntity<?> searchAilmentTypeByName(String name){
        List<AilmentType> ailmentType = ailmentTypeServices.searchAilmentTypeByNameNonProtected(name);
        if (ailmentType.isEmpty()){
            return ResponseEntity.ok("Nothing ailment type found");
        }
        return ResponseEntity.ok(ailmentType);
    }
    public ResponseEntity<?> findAllNonProtectedAilments(){
        return ResponseEntity.ok(ailmentTypeServices.findAllAilmentTypeNonProtected());
    }
    public ResponseEntity<?> findAllNonCustomAilmentTypes(){
        List<AilmentType> ailmentTypes=ailmentTypeServices.findAllNonCustomAilmentTypes();
        if (ailmentTypes.isEmpty()){
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(ailmentTypes);
    }
    public ResponseEntity<?> findAilmentTypeById(Long id){
        AilmentType ailmentType = ailmentTypeServices.findAilmentTypeById(id);
        if (ailmentType == null){
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(ailmentType);
    }
    public ResponseEntity<?> addAilmentType(AddAilmentTypeRequest addAilmentTypeRequest){
        return ResponseEntity.ok(ailmentTypeServices.makeNewAilmentType(addAilmentTypeRequest));
    }
    public ResponseEntity<?> updateAilmentType(Long id, AddAilmentTypeRequest addAilmentTypeRequest){
        return ResponseEntity.ok(ailmentTypeServices.updateAilmentType(id,addAilmentTypeRequest));
    }

    //protected section
    public ResponseEntity<?> searchAilmentTypeByNameProtected(String name){
        List<AilmentType> ailmentTypes = ailmentTypeServices.searchAilmentTypeByName(name);
        if (ailmentTypes.isEmpty()){
            return ResponseEntity.ok("no ailment types found");
        }
        return ResponseEntity.ok(ailmentTypes);
    }
    public ResponseEntity<?> findAllAilments(){
        return ResponseEntity.ok(ailmentTypeServices.findAllAilmentType());
    }
    public ResponseEntity<?> findAilmentTypeByIdProtected(Long id){
        if (ailmentTypeServices.findAilmentTypeByIdProtected(id)==null){
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(ailmentTypeServices.findAilmentTypeByIdProtected(id));
    }

    //personal section
    public ResponseEntity<?> findAllPersonalAilmentTypes(){
        List<AilmentType> ailmentTypes=ailmentTypeServices.findAllPersonalAilmentTypes();

        if (ailmentTypes.isEmpty()){
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(ailmentTypes);
    }
}
